//// src/main/java/school/handlers/FeesHandler.java
//package school.handlers;
//
//import com.sun.net.httpserver.HttpExchange;
//import school.auth.User;
//import school.config.Database;
//import school.http.ApiError;
//import school.http.Json;
//import school.http.SecureHandler;
//import school.services.AuditLogger;
//import school.services.Notifier;
//
//import java.math.BigDecimal;
//import java.net.URLDecoder;
//import java.nio.charset.StandardCharsets;
//import java.util.List;
//import java.util.Map;
//
//public class FeesHandler extends SecureHandler {
//
//    private static int asInt(Object value) {
//        if (value == null) throw new ApiError(400, "Missing required number field");
//        if (value instanceof Number) return ((Number) value).intValue();
//        if (value instanceof String) {
//            try {
//                return Integer.parseInt(((String) value).trim());
//            } catch (NumberFormatException e) {
//                throw new ApiError(400, "Expected a number");
//            }
//        }
//        throw new ApiError(400, "Expected a number");
//    }
//
//    private static double asDouble(Object value) {
//        if (value == null) throw new ApiError(400, "Missing required number field");
//        if (value instanceof Number) return ((Number) value).doubleValue();
//        if (value instanceof String) {
//            try {
//                return Double.parseDouble(((String) value).trim());
//            } catch (NumberFormatException e) {
//                throw new ApiError(400, "Expected a number");
//            }
//        }
//        throw new ApiError(400, "Expected a number");
//    }
//
//    private void verifyExists(String table, int id, String entityName) {
//        Map<String, Object> row = Database.queryOne("SELECT 1 FROM " + table + " WHERE id = ?", id);
//        if (row == null) {
//            throw new ApiError(400, entityName + " with id " + id + " does not exist");
//        }
//    }
//
//    @Override
//    protected void handleSecure(HttpExchange ex, User user) throws Exception {
//        requireRole(user, "super_admin", "admin");
//        String path = ex.getRequestURI().getPath();
//        String method = ex.getRequestMethod();
//
//        // ===== Fee structures (one entry per class per term — immutable) =====
//        if (path.equals("/api/fees/structures")) {
//            if ("GET".equalsIgnoreCase(method)) {
//                List<Map<String, Object>> structures = Database.query(
//                        "SELECT f.*, c.name as class_name, t.name as term_name " +
//                                "FROM fee_structures f JOIN classes c ON f.class_id = c.id JOIN terms t ON f.term_id = t.id " +
//                                "ORDER BY t.id DESC, c.name ASC"
//                );
//                Json.send(ex, 200, structures);
//                return;
//            }
//            if ("POST".equalsIgnoreCase(method)) {
//                Map<String, Object> body = Json.parseBody(ex);
//
//                int classId = asInt(body.get("classId"));
//                int termId = asInt(body.get("termId"));
//                double amountNum = asDouble(body.get("amount"));
//                BigDecimal amount = new BigDecimal(String.valueOf(amountNum));
//
//                verifyExists("classes", classId, "Class");
//                verifyExists("terms", termId, "Term");
//
//                Map<String, Object> term = Database.queryOne("SELECT closed FROM terms WHERE id = ?", termId);
//                if (Boolean.TRUE.equals(term.get("closed"))) {
//                    throw new ApiError(400, "This term is closed. Fee structures can only be set for open terms.");
//                }
//
//                // NEW: one fee per class per term — duplicates rejected with a clear message
//                Map<String, Object> existing = Database.queryOne(
//                        "SELECT f.amount FROM fee_structures f WHERE f.class_id = ? AND f.term_id = ?", classId, termId);
//                if (existing != null) {
//                    throw new ApiError(409, "A fee of " + existing.get("amount") +
//                            " already exists for this class in this term. Fees cannot be changed once set.");
//                }
//
//                try {
//                    Database.update("INSERT INTO fee_structures (class_id, term_id, amount) VALUES (?, ?, ?)", classId, termId, amount);
//                } catch (RuntimeException e) {
//                    if (e instanceof ApiError) throw (ApiError) e;
//                    if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
//                    if (e.getCause() instanceof java.sql.SQLException) {
//                        String state = ((java.sql.SQLException) e.getCause()).getSQLState();
//                        if (state != null && state.startsWith("23505")) {
//                            // Backup catch: the DB unique constraint rejected a race-condition duplicate
//                            throw new ApiError(409, "A fee for this class and term already exists. Fees cannot be changed once set.");
//                        }
//                        if (state != null && state.startsWith("23503")) {
//                            throw new ApiError(400, "One of the referenced records does not exist");
//                        }
//                    }
//                    throw e;
//                }
//                Json.send(ex, 201, Map.of("message", "Fee structure created"));
//                return;
//            }
//        }
//
//        // ===== Record payment — {invoiceId, amount} OR {studentId, termId, amount} =====
//        if (path.equals("/api/fees/record-payment") && "POST".equalsIgnoreCase(method)) {
//            Map<String, Object> body = Json.parseBody(ex);
//
//            Integer invoiceId = body.get("invoiceId") != null ? asInt(body.get("invoiceId")) : null;
//            Integer studentId = body.get("studentId") != null ? asInt(body.get("studentId")) : null;
//            Integer termId = body.get("termId") != null ? asInt(body.get("termId")) : null;
//            double amountNum = asDouble(body.get("amount"));
//
//            if (amountNum <= 0) {
//                throw new ApiError(400, "Amount must be greater than 0");
//            }
//            if (invoiceId == null && (studentId == null || termId == null)) {
//                throw new ApiError(400, "Provide invoiceId, OR studentId + termId");
//            }
//            final BigDecimal amount = new BigDecimal(String.valueOf(amountNum));
//
//            Map<String, Object> invoice;
//            if (invoiceId != null) {
//                invoice = Database.queryOne("SELECT i.id, i.balance, i.student_id FROM invoices i WHERE i.id = ?", invoiceId);
//                if (invoice == null) throw new ApiError(404, "Invoice not found");
//            } else {
//                verifyExists("students", studentId, "Student");
//                verifyExists("terms", termId, "Term");
//                invoice = Database.queryOne(
//                        "SELECT i.id, i.balance, i.student_id FROM invoices i WHERE i.student_id = ? AND i.term_id = ?",
//                        studentId, termId);
//                if (invoice == null) {
//                    throw new ApiError(404, "No invoice exists for this student in that term. Generate invoices first.");
//                }
//            }
//
//            BigDecimal currentBalance = new BigDecimal(invoice.get("balance").toString());
//            if (currentBalance.compareTo(BigDecimal.ZERO) == 0) {
//                throw new ApiError(400, "This invoice is already fully paid. Nothing is owed.");
//            }
//            if (amount.compareTo(currentBalance) > 0) {
//                throw new ApiError(400, "Payment of " + amount + " exceeds the outstanding balance of " + currentBalance);
//            }
//
//            final int finalInvoiceId = ((Number) invoice.get("id")).intValue();
//            try {
//                Database.transaction(con -> {
//                    Database.update(con, "INSERT INTO payments (invoice_id, amount, recorded_by) VALUES (?, ?, ?)", finalInvoiceId, amount, user.id);
//                    Database.update(con, "UPDATE invoices SET balance = balance - ? WHERE id = ?", amount, finalInvoiceId);
//                });
//            } catch (RuntimeException e) {
//                if (e instanceof ApiError) throw (ApiError) e;
//                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
//                if (e.getCause() instanceof java.sql.SQLException) {
//                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
//                    if (state != null && state.startsWith("23503")) {
//                        throw new ApiError(400, "One of the referenced records does not exist");
//                    }
//                }
//                throw e;
//            }
//
//            int invStudentId = ((Number) invoice.get("student_id")).intValue();
//            List<Map<String, Object>> parents = Database.query("SELECT parent_user_id FROM parent_links WHERE student_id = ?", invStudentId);
//            for (Map<String, Object> p : parents) {
//                Notifier.notify(((Number) p.get("parent_user_id")).intValue(), "PAYMENT_OK", Map.of("amount", amount.toString()));
//            }
//
//            AuditLogger.success(user, "PAYMENT_RECORDED", "invoices", finalInvoiceId, null,
//                    Map.of("amount", amount, "student_id", invStudentId));
//            Json.send(ex, 200, Map.of(
//                    "message", "Payment recorded successfully",
//                    "remainingBalance", currentBalance.subtract(amount)
//            ));
//            return;
//        }
//
//        // ===== Generate invoices — active term by default; explicit termId works on closed terms =====
//        if (path.equals("/api/fees/generate-invoices") && "POST".equalsIgnoreCase(method)) {
//            Map<String, Object> body = Json.parseBody(ex);
//            int classId = asInt(body.get("classId"));
//
//            verifyExists("classes", classId, "Class");
//
//            int termId;
//            if (body.get("termId") != null) {
//                termId = asInt(body.get("termId"));
//                verifyExists("terms", termId, "Term");
//            } else {
//                Map<String, Object> activeTerm = Database.queryOne("SELECT id FROM terms WHERE active = TRUE");
//                if (activeTerm == null) {
//                    throw new ApiError(400, "No active term found. Pass a termId to bill a specific term.");
//                }
//                termId = ((Number) activeTerm.get("id")).intValue();
//            }
//
//            Map<String, Object> fee = Database.queryOne("SELECT amount FROM fee_structures WHERE class_id = ? AND term_id = ?", classId, termId);
//            if (fee == null) throw new ApiError(400, "No fee structure found for this class and term");
//
//            int count;
//            try {
//                count = Database.update(
//                        "INSERT INTO invoices (student_id, term_id, amount, balance) " +
//                                "SELECT id, ?, ?, ? FROM students WHERE class_id = ? AND graduated = FALSE " +
//                                "AND NOT EXISTS (SELECT 1 FROM invoices WHERE student_id = students.id AND term_id = ?)",
//                        termId, fee.get("amount"), fee.get("amount"), classId, termId
//                );
//            } catch (RuntimeException e) {
//                if (e instanceof ApiError) throw (ApiError) e;
//                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
//                if (e.getCause() instanceof java.sql.SQLException) {
//                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
//                    if (state != null && state.startsWith("23503")) {
//                        throw new ApiError(400, "One of the referenced records does not exist");
//                    }
//                }
//                throw e;
//            }
//
//            AuditLogger.success(user, "INVOICES_GENERATED", "classes", classId, null, Map.of("count", count, "term_id", termId));
//            Json.send(ex, 200, Map.of("message", count + " invoices generated"));
//            return;
//        }
//
//        // ===== Remind debtors (all terms) =====
//        if (path.equals("/api/fees/remind-debtors") && "POST".equalsIgnoreCase(method)) {
//            List<Map<String, Object>> debtors = Database.query(
//                    "SELECT i.balance, s.full_name as student_name, p.parent_user_id, t.name as term_name " +
//                            "FROM invoices i JOIN students s ON i.student_id = s.id " +
//                            "JOIN parent_links p ON s.id = p.student_id " +
//                            "JOIN terms t ON i.term_id = t.id " +
//                            "WHERE i.balance > 0"
//            );
//
//            int count = 0;
//            for (Map<String, Object> d : debtors) {
//                int parentId = ((Number) d.get("parent_user_id")).intValue();
//                Notifier.notify(parentId, "FEE_REMINDER", Map.of(
//                        "student", (String) d.get("student_name"),
//                        "amount", d.get("balance").toString()
//                ));
//                count++;
//            }
//
//            AuditLogger.success(user, "FEE_REMINDERS_SENT", null, null, null, Map.of("count", count));
//            Json.send(ex, 200, Map.of("message", "Sent " + count + " reminders"));
//            return;
//        }
//
//        // ===== Debtors (all terms, with invoice_id + term name) =====
//        if (path.equals("/api/fees/debtors") && "GET".equalsIgnoreCase(method)) {
//            String query = ex.getRequestURI().getQuery();
//            String q = "";
//            int page = 1;
//            int limit = 50;
//
//            if (query != null) {
//                for (String param : query.split("&")) {
//                    String[] pair = param.split("=");
//                    if (pair.length == 2) {
//                        if (pair[0].equals("q")) q = URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
//                        if (pair[0].equals("page")) page = Integer.parseInt(pair[1]);
//                    }
//                }
//            }
//
//            int offset = (page - 1) * limit;
//            String searchPattern = "%" + q + "%";
//
//            String sql = "SELECT i.id AS invoice_id, s.id, s.full_name, s.admission_no, c.name as class_name, " +
//                    "t.name as term_name, i.amount, i.balance " +
//                    "FROM invoices i JOIN students s ON i.student_id = s.id " +
//                    "LEFT JOIN classes c ON s.class_id = c.id " +
//                    "JOIN terms t ON i.term_id = t.id " +
//                    "WHERE i.balance > 0 " +
//                    "AND (s.full_name ILIKE ? OR s.admission_no ILIKE ?) " +
//                    "ORDER BY i.balance DESC LIMIT ? OFFSET ?";
//
//            List<Map<String, Object>> items = Database.query(sql, searchPattern, searchPattern, limit, offset);
//
//            long total = ((Number) Database.queryOne(
//                    "SELECT COUNT(*) as c FROM invoices i JOIN students s ON i.student_id = s.id " +
//                            "WHERE i.balance > 0 AND (s.full_name ILIKE ? OR s.admission_no ILIKE ?)",
//                    searchPattern, searchPattern
//            ).get("c")).longValue();
//
//            Json.send(ex, 200, Map.of(
//                    "items", items,
//                    "total", total,
//                    "page", page,
//                    "pages", (int) Math.ceil((double) total / limit)
//            ));
//            return;
//        }
//
//        throw new ApiError(404, "Not found");
//    }
//}

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

        // ===== Fee structures (one per class per term — immutable) =====
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

                Map<String, Object> term = Database.queryOne("SELECT closed FROM terms WHERE id = ?", termId);
                if (Boolean.TRUE.equals(term.get("closed"))) {
                    throw new ApiError(400, "This term is closed. Fee structures can only be set for open terms.");
                }

                Map<String, Object> existing = Database.queryOne(
                        "SELECT f.amount FROM fee_structures f WHERE f.class_id = ? AND f.term_id = ?", classId, termId);
                if (existing != null) {
                    throw new ApiError(409, "A fee of " + existing.get("amount") +
                            " already exists for this class in this term. Fees cannot be changed once set.");
                }

                try {
                    Database.update("INSERT INTO fee_structures (class_id, term_id, amount) VALUES (?, ?, ?)", classId, termId, amount);
                } catch (RuntimeException e) {
                    if (e instanceof ApiError) throw (ApiError) e;
                    if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                    if (e.getCause() instanceof java.sql.SQLException) {
                        String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                        if (state != null && state.startsWith("23505")) {
                            throw new ApiError(409, "A fee for this class and term already exists. Fees cannot be changed once set.");
                        }
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

        // ===== Record payment — {invoiceId, amount} OR {studentId, termId, amount} =====
        if (path.equals("/api/fees/record-payment") && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);

            Integer invoiceId = body.get("invoiceId") != null ? asInt(body.get("invoiceId")) : null;
            Integer studentId = body.get("studentId") != null ? asInt(body.get("studentId")) : null;
            Integer termId = body.get("termId") != null ? asInt(body.get("termId")) : null;
            double amountNum = asDouble(body.get("amount"));

            if (amountNum <= 0) {
                throw new ApiError(400, "Amount must be greater than 0");
            }
            if (invoiceId == null && (studentId == null || termId == null)) {
                throw new ApiError(400, "Provide invoiceId, OR studentId + termId");
            }
            final BigDecimal amount = new BigDecimal(String.valueOf(amountNum));

            Map<String, Object> invoice;
            if (invoiceId != null) {
                invoice = Database.queryOne("SELECT i.id, i.balance, i.student_id FROM invoices i WHERE i.id = ?", invoiceId);
                if (invoice == null) throw new ApiError(404, "Invoice not found");
            } else {
                verifyExists("students", studentId, "Student");
                verifyExists("terms", termId, "Term");
                invoice = Database.queryOne(
                        "SELECT i.id, i.balance, i.student_id FROM invoices i WHERE i.student_id = ? AND i.term_id = ?",
                        studentId, termId);
                if (invoice == null) {
                    throw new ApiError(404, "No invoice exists for this student in that term. Generate invoices first.");
                }
            }

            BigDecimal currentBalance = new BigDecimal(invoice.get("balance").toString());
            if (currentBalance.compareTo(BigDecimal.ZERO) == 0) {
                throw new ApiError(400, "This invoice is already fully paid. Nothing is owed.");
            }
            if (amount.compareTo(currentBalance) > 0) {
                throw new ApiError(400, "Payment of " + amount + " exceeds the outstanding balance of " + currentBalance);
            }

            final int finalInvoiceId = ((Number) invoice.get("id")).intValue();
            try {
                Database.transaction(con -> {
                    Database.update(con, "INSERT INTO payments (invoice_id, amount, recorded_by) VALUES (?, ?, ?)", finalInvoiceId, amount, user.id);
                    Database.update(con, "UPDATE invoices SET balance = balance - ? WHERE id = ?", amount, finalInvoiceId);
                });
            } catch (RuntimeException e) {
                if (e instanceof ApiError) throw (ApiError) e;
                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                if (e.getCause() instanceof java.sql.SQLException) {
                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                    if (state != null && state.startsWith("23503")) {
                        throw new ApiError(400, "One of the referenced records does not exist");
                    }
                }
                throw e;
            }

            int invStudentId = ((Number) invoice.get("student_id")).intValue();
            List<Map<String, Object>> parents = Database.query("SELECT parent_user_id FROM parent_links WHERE student_id = ?", invStudentId);
            for (Map<String, Object> p : parents) {
                Notifier.notify(((Number) p.get("parent_user_id")).intValue(), "PAYMENT_OK", Map.of("amount", amount.toString()));
            }

            AuditLogger.success(user, "PAYMENT_RECORDED", "invoices", finalInvoiceId, null,
                    Map.of("amount", amount, "student_id", invStudentId));
            Json.send(ex, 200, Map.of(
                    "message", "Payment recorded successfully",
                    "remainingBalance", currentBalance.subtract(amount)
            ));
            return;
        }

        // ===== Generate invoices — active term by default; explicit termId works on closed terms =====
        if (path.equals("/api/fees/generate-invoices") && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            int classId = asInt(body.get("classId"));

            verifyExists("classes", classId, "Class");

            int termId;
            if (body.get("termId") != null) {
                termId = asInt(body.get("termId"));
                verifyExists("terms", termId, "Term");
            } else {
                Map<String, Object> activeTerm = Database.queryOne("SELECT id FROM terms WHERE active = TRUE");
                if (activeTerm == null) {
                    throw new ApiError(400, "No active term found. Pass a termId to bill a specific term.");
                }
                termId = ((Number) activeTerm.get("id")).intValue();
            }

            Map<String, Object> fee = Database.queryOne("SELECT amount FROM fee_structures WHERE class_id = ? AND term_id = ?", classId, termId);
            if (fee == null) throw new ApiError(400, "No fee structure found for this class and term");

            int count;
            try {
                count = Database.update(
                        "INSERT INTO invoices (student_id, term_id, amount, balance) " +
                                "SELECT id, ?, ?, ? FROM students WHERE class_id = ? AND graduated = FALSE " +
                                "AND NOT EXISTS (SELECT 1 FROM invoices WHERE student_id = students.id AND term_id = ?)",
                        termId, fee.get("amount"), fee.get("amount"), classId, termId
                );
            } catch (RuntimeException e) {
                if (e instanceof ApiError) throw (ApiError) e;
                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                if (e.getCause() instanceof java.sql.SQLException) {
                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                    if (state != null && state.startsWith("23503")) {
                        throw new ApiError(400, "One of the referenced records does not exist");
                    }
                }
                throw e;
            }

            AuditLogger.success(user, "INVOICES_GENERATED", "classes", classId, null, Map.of("count", count, "term_id", termId));
            Json.send(ex, 200, Map.of("message", count + " invoices generated"));
            return;
        }

        // ===== Remind debtors — began terms only (active OR closed) =====
        if (path.equals("/api/fees/remind-debtors") && "POST".equalsIgnoreCase(method)) {
            List<Map<String, Object>> debtors = Database.query(
                    "SELECT i.balance, s.full_name as student_name, p.parent_user_id, t.name as term_name " +
                            "FROM invoices i JOIN students s ON i.student_id = s.id " +
                            "JOIN parent_links p ON s.id = p.student_id " +
                            "JOIN terms t ON i.term_id = t.id " +
                            "WHERE (t.active = TRUE OR t.closed = TRUE) AND i.balance > 0"
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

        // ===== Debtors — began terms only (active OR closed) =====
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

            String sql = "SELECT i.id AS invoice_id, s.id, s.full_name, s.admission_no, c.name as class_name, " +
                    "t.name as term_name, i.amount, i.balance " +
                    "FROM invoices i JOIN students s ON i.student_id = s.id " +
                    "LEFT JOIN classes c ON s.class_id = c.id " +
                    "JOIN terms t ON i.term_id = t.id " +
                    "WHERE (t.active = TRUE OR t.closed = TRUE) AND i.balance > 0 " +
                    "AND (s.full_name ILIKE ? OR s.admission_no ILIKE ?) " +
                    "ORDER BY i.balance DESC LIMIT ? OFFSET ?";

            List<Map<String, Object>> items = Database.query(sql, searchPattern, searchPattern, limit, offset);

            long total = ((Number) Database.queryOne(
                    "SELECT COUNT(*) as c FROM invoices i JOIN students s ON i.student_id = s.id " +
                            "JOIN terms t ON i.term_id = t.id " +
                            "WHERE (t.active = TRUE OR t.closed = TRUE) AND i.balance > 0 AND (s.full_name ILIKE ? OR s.admission_no ILIKE ?)",
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