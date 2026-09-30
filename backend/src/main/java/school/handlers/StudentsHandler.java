package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.config.Env;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Notifier;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Year;
import java.util.List;
import java.util.Map;

public class StudentsHandler extends SecureHandler {
    private static final SecureRandom random = new SecureRandom();

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

    private void verifyExists(String table, int id, String entityName) {
        Map<String, Object> row = Database.queryOne("SELECT 1 FROM " + table + " WHERE id = ?", id);
        if (row == null) {
            throw new ApiError(400, entityName + " with id " + id + " does not exist");
        }
    }

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        String method = ex.getRequestMethod();

        if ("GET".equalsIgnoreCase(method)) {
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

            String sql = "SELECT s.id, s.admission_no, s.full_name, c.name as class_name, s.graduated " +
                    "FROM students s LEFT JOIN classes c ON s.class_id = c.id " +
                    "WHERE s.full_name ILIKE ? OR s.admission_no ILIKE ? " +
                    "ORDER BY s.id DESC LIMIT ? OFFSET ?";

            List<Map<String, Object>> items = Database.query(sql, searchPattern, searchPattern, limit, offset);

            long total = ((Number) Database.queryOne(
                    "SELECT COUNT(*) as c FROM students WHERE full_name ILIKE ? OR admission_no ILIKE ?",
                    searchPattern, searchPattern
            ).get("c")).longValue();

            Map<String, Object> response = new java.util.LinkedHashMap<>();
            response.put("items", items);
            response.put("total", total);
            response.put("page", page);
            response.put("pages", (int) Math.ceil((double) total / limit));
            Json.send(ex, 200, response);
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            String fullName = (String) body.get("fullName");
            String admissionNo = (String) body.get("admissionNo");
            String parentPhone = (String) body.get("parentPhone");
            String parentName = (String) body.get("parentName");

            if (fullName == null || parentPhone == null || parentName == null) {
                throw new ApiError(400, "Full name, class, parent phone, and parent name are required");
            }

            int classId = asInt(body.get("classId"));
            verifyExists("classes", classId, "Class");

            final String validatedFullName = validateAndFormatName(fullName);
            final String validatedParentName = validateAndFormatName(parentName);
            final int finalClassId = classId;
            final String finalParentPhone = parentPhone;
            final String providedAdmissionNo = admissionNo;

            Map<String, Object> activeSession = Database.queryOne("SELECT id FROM academic_sessions WHERE active = TRUE");
            if (activeSession == null) {
                throw new ApiError(400, "No active academic session found. Please activate a session first.");
            }
            final int sessionId = ((Number) activeSession.get("id")).intValue();

            try {
                Database.transaction(con -> {
                    String finalAdmNo = providedAdmissionNo;
                    if (finalAdmNo == null || finalAdmNo.trim().isEmpty()) {
                        int year = Year.now().getValue();
                        long count = ((Number) Database.queryOne(con, "SELECT COUNT(*) as c FROM students").get("c")).longValue();
                        finalAdmNo = String.format("%d-%04d", year, count + 1);
                    }

                    // 1. Insert student user
                    int studentUserId = ((Number) Database.queryOne(con,
                            "INSERT INTO users (full_name, role, active) VALUES (?, 'student', TRUE) RETURNING id",
                            validatedFullName
                    ).get("id")).intValue();

                    // 2. Insert student row
                    int studentId = ((Number) Database.queryOne(con,
                            "INSERT INTO students (user_id, admission_no, full_name, class_id, current_session_id) VALUES (?, ?, ?, ?, ?) RETURNING id",
                            studentUserId, finalAdmNo, validatedFullName, finalClassId, sessionId
                    ).get("id")).intValue();

                    // 3. Find or create parent
                    Map<String, Object> parent = Database.queryOne(con, "SELECT id FROM users WHERE phone = ? AND role = 'parent'", finalParentPhone);
                    int parentId;
                    if (parent != null) {
                        parentId = ((Number) parent.get("id")).intValue();
                    } else {
                        parentId = ((Number) Database.queryOne(con,
                                "INSERT INTO users (full_name, phone, role, active) VALUES (?, ?, 'parent', TRUE) RETURNING id",
                                validatedParentName, finalParentPhone
                        ).get("id")).intValue();

                        String token = generateToken();
                        Database.update(con, "INSERT INTO activation_tokens (token, user_id, expires_at) VALUES (?, ?, now() + interval '24 hours')", token, parentId);
                        String link = Env.get("APP_URL") + "/activate?token=" + token;
                        Notifier.notify(parentId, "ACCOUNT_CREATED", Map.of("link", link, "name", validatedParentName));
                    }

                    // 4. Link parent and student
                    Database.update(con, "INSERT INTO parent_links (parent_user_id, student_id) VALUES (?, ?) ON CONFLICT DO NOTHING", parentId, studentId);

                    // 5. Auto-invoice if active term fee structure exists
                    Map<String, Object> activeTerm = Database.queryOne(con, "SELECT id FROM terms WHERE active = TRUE");
                    if (activeTerm != null) {
                        int termId = ((Number) activeTerm.get("id")).intValue();
                        Map<String, Object> fee = Database.queryOne(con, "SELECT amount FROM fee_structures WHERE class_id = ? AND term_id = ?", finalClassId, termId);
                        if (fee != null) {
                            Database.update(con, "INSERT INTO invoices (student_id, term_id, amount, balance) VALUES (?, ?, ?, ?)",
                                    studentId, termId, fee.get("amount"), fee.get("amount"));
                        }
                    }

                    AuditLogger.success(user, "STUDENT_ADMITTED", "students", studentId, null, Map.of("admission_no", finalAdmNo, "name", validatedFullName));
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

            Json.send(ex, 201, Map.of("message", "Student admitted successfully"));
            return;
        }
        throw new ApiError(405, "Method not allowed");
    }

    private String validateAndFormatName(String name) {
        name = name.trim().replaceAll("\\s+", " ");
        if (name.length() < 2 || name.length() > 100) {
            throw new ApiError(400, "Please enter a valid full name.");
        }
        if (!name.matches(".*\\p{L}.*")) {
            throw new ApiError(400, "Please enter a valid full name.");
        }
        if (!name.matches("^[\\p{L} \\-'.]+$")) {
            throw new ApiError(400, "Please enter a valid full name.");
        }
        return name;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}