// backend/src/main/java/school/handlers/FeesHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Notifier;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public class FeesHandler extends SecureHandler {

    private static int asInt(Object value) {
        if (value == null) throw new ApiError(400, "Missing required number field");
        if (value instanceof Number) return ((Number) value).intValue();
        if (value instanceof String) {
            try {
                return Integer.parseInt(((String) value).trim());
            } catch (NumberFormatException e) {
                throw new ApiError(400, "Expected a number");
            }
        }
        throw new ApiError(400, "Expected a number");
    }

    private static double asDouble(Object value) {
        if (value == null) throw new ApiError(400, "Missing required number field");
        if (value instanceof Number) return ((Number) value).doubleValue();
        if (value instanceof String) {
            try {
                return Double.parseDouble(((String) value).trim());
            } catch (NumberFormatException e) {
                throw new ApiError(400, "Expected a number");
            }
        }
        throw new ApiError(400, "Expected a number");
    }

    private void verifyExists(String table, int id, String entityName) {
        Map<String, Object> row = Database.queryOne("SELECT 1 FROM " + table + " WHERE id = ?", id);
        if (row == null) {
            throw new ApiError(400, entityName + " with id " + id + " does not exist");
        }
    }

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if (path.equals("/api/fees/structures")) {
            if ("GET".equalsIgnoreCase(method)) {
                List<Map<String, Object>> structures = Database.query(
                        "SELECT f.*, c.name as class_name, t.name as term_name " +
                                "FROM fee_structures f JOIN classes c ON f.class_id = c.id JOIN terms t ON f.term_id = t.id " +
                                "ORDER BY t.id DESC, c.name ASC"
                );
                Json.send(ex, 200, structures);
                return;
            }
            if ("POST".equalsIgnoreCase(method)) {
                Map<String, Object> body = Json.parseBody(ex);

                int classId = asInt(body.get("classId"));
                int termId = asInt(body.get("termId"));
                double amountNum = asDouble(body.get("amount"));
                BigDecimal amount = new BigDecimal(String.valueOf(amountNum));

                verifyExists("classes", classId, "Class");
                verifyExists("terms", termId, "Term");

                try {
                    Database.update("INSERT INTO fee_structures (class_id, term_id, amount) VALUES (?, ?, ?)", classId, termId, amount);
                } catch (RuntimeException e) {
                    if (e.getCause() instanceof java.sql.SQLException) {
                        String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                        if (state != null && state.startsWith("23503")) {
                            throw new ApiError(400, "One of the referenced records does not exist");
                        }
                    }
                    throw e;
                }
                Json.send(ex, 201, Map.of("message", "Fee structure created"));
                return;
            }
        }

        if (path.equals("/api/fees/record-payment") && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);

            int invoiceId = asInt(body.get("invoiceId"));
            double amountNum = asDouble(body.get("amount"));

            if (amountNum <= 0) {
                throw new ApiError(400, "Valid invoice ID and amount > 0 are required");
            }
            BigDecimal amount = new BigDecimal(String.valueOf(amountNum));

            Map<String, Object> invoice = Database.queryOne(
                    "SELECT i.balance, i.student_id, t.closed FROM invoices i JOIN terms t ON i.term_id = t.id WHERE i.id = ?", invoiceId
            );
            if (invoice == null) throw new ApiError(404, "Invoice not found");
            if (Boolean.TRUE.equals(invoice.get("closed"))) {
                throw new ApiError(400, "This term is closed.");
            }

            BigDecimal currentBalance = new BigDecimal(invoice.get("balance").toString());
            if (amount.compareTo(currentBalance) > 0) {
                throw new ApiError(400, "Payment amount exceeds current balance");
            }

            try {
                Database.transaction(con -> {
                    Database.update(con, "INSERT INTO payments (invoice_id, amount, recorded_by) VALUES (?, ?, ?)", invoiceId, amount, user.id);
                    Database.update(con, "UPDATE invoices SET balance = balance - ? WHERE id = ?", amount, invoiceId);
                });
            } catch (RuntimeException e) {
                if (e.getCause() instanceof java.sql.SQLException) {
                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                    if (state != null && state.startsWith("23503")) {
                        throw new ApiError(400, "One of the referenced records does not exist");
                    }
                }
                throw e;
            }

            int studentId = ((Number) invoice.get("student_id")).intValue();
            List<Map<String, Object>> parents = Database.query("SELECT parent_user_id FROM parent_links WHERE student_id = ?", studentId);
            for (Map<String, Object> p : parents) {
                Notifier.notify(((Number) p.get("parent_user_id")).intValue(), "PAYMENT_OK", Map.of("amount", amount.toString()));
            }

            AuditLogger.success(user, "PAYMENT_RECORDED", "invoices", invoiceId, null, Map.of("amount", amount));
            Json.send(ex, 200, Map.of("message", "Payment recorded successfully"));
            return;
        }

        if (path.equals("/api/fees/generate-invoices") && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            int classId = asInt(body.get("classId"));

            verifyExists("classes", classId, "Class");

            Map<String, Object> activeTerm = Database.queryOne("SELECT id FROM terms WHERE active = TRUE");
            if (activeTerm == null) throw new ApiError(400, "No active term found");
            int termId = ((Number) activeTerm.get("id")).intValue();

            Map<String, Object> fee = Database.queryOne("SELECT amount FROM fee_structures WHERE class_id = ? AND term_id = ?", classId, termId);
            if (fee == null) throw new ApiError(400, "No fee structure found for this class and active term");

            int count;
            try {
                count = Database.update(
                        "INSERT INTO invoices (student_id, term_id, amount, balance) " +
                                "SELECT id, ?, ?, ? FROM students WHERE class_id = ? AND graduated = FALSE " +
                                "AND NOT EXISTS (SELECT 1 FROM invoices WHERE student_id = students.id AND term_id = ?)",
                        termId, fee.get("amount"), fee.get("amount"), classId, termId
                );
            } catch (RuntimeException e) {
                if (e.getCause() instanceof java.sql.SQLException) {
                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                    if (state != null && state.startsWith("23503")) {
                        throw new ApiError(400, "One of the referenced records does not exist");
                    }
                }
                throw e;
            }

            AuditLogger.success(user, "INVOICES_GENERATED", "classes", classId, null, Map.of("count", count));
            Json.send(ex, 200, Map.of("message", count + " invoices generated"));
            return;
        }

        if (path.equals("/api/fees/remind-debtors") && "POST".equalsIgnoreCase(method)) {
            List<Map<String, Object>> debtors = Database.query(
                    "SELECT i.balance, s.full_name as student_name, p.parent_user_id " +
                            "FROM invoices i JOIN students s ON i.student_id = s.id " +
                            "JOIN parent_links p ON s.id = p.student_id " +
                            "JOIN terms t ON i.term_id = t.id " +
                            "WHERE t.active = TRUE AND i.balance > 0"
            );

            int count = 0;
            for (Map<String, Object> d : debtors) {
                int parentId = ((Number) d.get("parent_user_id")).intValue();
                Notifier.notify(parentId, "FEE_REMINDER", Map.of(
                        "student", (String) d.get("student_name"),
                        "amount", d.get("balance").toString()
                ));
                count++;
            }

            AuditLogger.success(user, "FEE_REMINDERS_SENT", null, null, null, Map.of("count", count));
            Json.send(ex, 200, Map.of("message", "Sent " + count + " reminders"));
            return;
        }

        if (path.equals("/api/fees/debtors") && "GET".equalsIgnoreCase(method)) {
            String query = ex.getRequestURI().getQuery();
            String q = "";
            int page = 1;
            int limit = 50;

            if (query != null) {
                for (String param : query.split("&")) {
                    String[] pair = param.split("=");
                    if (pair.length == 2) {
                        if (pair[0].equals("q")) q = URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
                        if (pair[0].equals("page")) page = Integer.parseInt(pair[1]);
                    }
                }
            }

            int offset = (page - 1) * limit;
            String searchPattern = "%" + q + "%";

            String sql = "SELECT s.id, s.full_name, s.admission_no, c.name as class_name, i.balance " +
                    "FROM invoices i JOIN students s ON i.student_id = s.id " +
                    "LEFT JOIN classes c ON s.class_id = c.id " +
                    "JOIN terms t ON i.term_id = t.id " +
                    "WHERE t.active = TRUE AND i.balance > 0 " +
                    "AND (s.full_name ILIKE ? OR s.admission_no ILIKE ?) " +
                    "ORDER BY i.balance DESC LIMIT ? OFFSET ?";

            List<Map<String, Object>> items = Database.query(sql, searchPattern, searchPattern, limit, offset);

            long total = ((Number) Database.queryOne(
                    "SELECT COUNT(*) as c FROM invoices i JOIN students s ON i.student_id = s.id JOIN terms t ON i.term_id = t.id " +
                            "WHERE t.active = TRUE AND i.balance > 0 AND (s.full_name ILIKE ? OR s.admission_no ILIKE ?)",
                    searchPattern, searchPattern
            ).get("c")).longValue();

            Json.send(ex, 200, Map.of(
                    "items", items,
                    "total", total,
                    "page", page,
                    "pages", (int) Math.ceil((double) total / limit)
            ));
            return;
        }

        throw new ApiError(404, "Not found");
    }
}