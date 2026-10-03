// backend/src/main/java/school/handlers/StudentsHandler.java
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
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if ("/api/students".equals(path) && "GET".equalsIgnoreCase(method)) {
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

            Json.send(ex, 200, Map.of(
                    "items", items,
                    "total", total,
                    "page", page,
                    "pages", (int) Math.ceil((double) total / limit)
            ));
            return;
        }

        if ("/api/students".equals(path) && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);

            String rawFullName = body.get("fullName") != null ? ((String) body.get("fullName")).trim() : null;
            String rawAdmissionNo = body.get("admissionNo") != null ? ((String) body.get("admissionNo")).trim() : null;
            String rawParentPhone = body.get("parentPhone") != null ? ((String) body.get("parentPhone")).trim() : null;
            String rawParentName = body.get("parentName") != null ? ((String) body.get("parentName")).trim() : null;

            if (rawFullName == null || rawFullName.isEmpty() || rawParentPhone == null || rawParentPhone.isEmpty() || rawParentName == null || rawParentName.isEmpty()) {
                throw new ApiError(400, "Full name, class, parent phone, and parent name are required");
            }

            int classId = asInt(body.get("classId"));
            verifyExists("classes", classId, "Class");

            final String fullName = validateAndFormatName(rawFullName);
            final String parentName = validateAndFormatName(rawParentName);
            final String parentPhone = rawParentPhone;
            final String admissionNo = rawAdmissionNo;

            if (!parentPhone.matches("^\\+?[0-9]{7,15}$")) {
                throw new ApiError(400, "Please enter a valid phone number");
            }

            Map<String, Object> activeSession = Database.queryOne("SELECT id FROM academic_sessions WHERE active = TRUE");
            if (activeSession == null) {
                throw new ApiError(400, "No active academic session found. Please activate a session first.");
            }
            final int sessionId = ((Number) activeSession.get("id")).intValue();

            final int[] newParentId = {-1};
            final String[] newParentToken = {null};
            final String[] finalAdmNoOut = {null};

            try {
                Database.transaction(con -> {
                    String finalAdmNo = admissionNo;
                    if (finalAdmNo == null || finalAdmNo.isEmpty()) {
                        int year = Year.now().getValue();
                        long count = ((Number) Database.queryOne(con, "SELECT COUNT(*) as c FROM students").get("c")).longValue();
                        finalAdmNo = String.format("%d-%04d", year, count + 1);
                    } else {
                        if (Database.queryOne(con, "SELECT id FROM students WHERE admission_no = ?", finalAdmNo) != null) {
                            throw new ApiError(400, "This admission number is already in use");
                        }
                    }
                    finalAdmNoOut[0] = finalAdmNo;

                    int studentUserId = ((Number) Database.queryOne(con,
                            "INSERT INTO users (full_name, role, active) VALUES (?, 'student', TRUE) RETURNING id",
                            fullName
                    ).get("id")).intValue();

                    int studentId = ((Number) Database.queryOne(con,
                            "INSERT INTO students (user_id, admission_no, full_name, class_id, current_session_id) VALUES (?, ?, ?, ?, ?) RETURNING id",
                            studentUserId, finalAdmNo, fullName, classId, sessionId
                    ).get("id")).intValue();

                    Map<String, Object> existingUser = Database.queryOne(con, "SELECT id, role FROM users WHERE phone = ?", parentPhone);
                    int parentId;

                    if (existingUser != null) {
                        if (!"parent".equals(existingUser.get("role"))) {
                            throw new ApiError(400, "This phone number is already registered to a non-parent account");
                        }
                        parentId = ((Number) existingUser.get("id")).intValue();
                    } else {
                        try {
                            parentId = ((Number) Database.queryOne(con,
                                    "INSERT INTO users (full_name, phone, role, active) VALUES (?, ?, 'parent', TRUE) RETURNING id",
                                    parentName, parentPhone
                            ).get("id")).intValue();
                        } catch (RuntimeException e) {
                            if (e instanceof ApiError) throw (ApiError) e;
                            if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                            if (e.getCause() instanceof java.sql.SQLException) {
                                String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                                if (state != null && state.startsWith("23505")) {
                                    throw new ApiError(400, "This phone number is already registered");
                                }
                            }
                            throw e;
                        }

                        String token = generateToken();
                        Database.update(con, "INSERT INTO activation_tokens (token, user_id, expires_at) VALUES (?, ?, now() + interval '24 hours')", token, parentId);

                        newParentId[0] = parentId;
                        newParentToken[0] = token;
                    }

                    Database.update(con, "INSERT INTO parent_links (parent_user_id, student_id) VALUES (?, ?) ON CONFLICT DO NOTHING", parentId, studentId);

                    Map<String, Object> activeTerm = Database.queryOne(con, "SELECT id FROM terms WHERE active = TRUE");
                    if (activeTerm != null) {
                        int termId = ((Number) activeTerm.get("id")).intValue();
                        Map<String, Object> fee = Database.queryOne(con, "SELECT amount FROM fee_structures WHERE class_id = ? AND term_id = ?", classId, termId);
                        if (fee != null) {
                            Database.update(con, "INSERT INTO invoices (student_id, term_id, amount, balance) VALUES (?, ?, ?, ?)",
                                    studentId, termId, fee.get("amount"), fee.get("amount"));
                        }
                    }

                    AuditLogger.success(user, "STUDENT_ADMITTED", "students", studentId, null, Map.of("admission_no", finalAdmNo, "name", fullName));
                });
            } catch (RuntimeException e) {
                if (e instanceof ApiError) throw (ApiError) e;
                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                if (e.getCause() instanceof java.sql.SQLException) {
                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                    if (state != null && state.startsWith("23503")) {
                        throw new ApiError(400, "One of the referenced records does not exist");
                    }
                    if (state != null && state.startsWith("23505")) {
                        throw new ApiError(400, "A unique constraint was violated (e.g., duplicate admission number)");
                    }
                }
                throw e;
            }

            if (newParentId[0] != -1) {
                String link = Env.get("APP_URL") + "/activate?token=" + newParentToken[0];
                Notifier.notify(newParentId[0], "ACCOUNT_CREATED", Map.of("link", link, "name", parentName));
            }

            Json.send(ex, 201, Map.of("message", "Student admitted successfully"));
            return;
        }

        if (path.matches("/api/students/\\d+/class") && "PATCH".equalsIgnoreCase(method)) {
            int studentId = pathInt(path.split("/")[3]);
            Map<String, Object> body = Json.parseBody(ex);
            int classId = asInt(body.get("classId"));

            Map<String, Object> student = Database.queryOne("SELECT id, full_name, class_id, graduated FROM students WHERE id = ?", studentId);
            if (student == null) throw new ApiError(404, "Student not found");
            if (Boolean.TRUE.equals(student.get("graduated"))) {
                throw new ApiError(400, "Student has graduated and cannot be moved");
            }

            verifyExists("classes", classId, "Class");

            Database.update("UPDATE students SET class_id = ? WHERE id = ?", classId, studentId);

            AuditLogger.success(user, "STUDENT_MOVED", "students", studentId,
                    Map.of("class_id", student.get("class_id")),
                    Map.of("class_id", classId, "student_name", student.get("full_name"))
            );

            Json.send(ex, 200, Map.of("message", "Student moved successfully"));
            return;
        }

        if (path.matches("/api/students/\\d+/graduate") && "PATCH".equalsIgnoreCase(method)) {
            int studentId = pathInt(path.split("/")[3]);

            Map<String, Object> student = Database.queryOne("SELECT id, full_name, user_id, graduated FROM students WHERE id = ?", studentId);
            if (student == null) throw new ApiError(404, "Student not found");
            if (Boolean.TRUE.equals(student.get("graduated"))) {
                throw new ApiError(400, "Student has already graduated");
            }

            int userId = ((Number) student.get("user_id")).intValue();

            Database.transaction(con -> {
                Database.update(con, "UPDATE students SET graduated = TRUE WHERE id = ?", studentId);
                Database.update(con, "UPDATE users SET active = FALSE WHERE id = ?", userId);
            });

            AuditLogger.success(user, "STUDENTS_GRADUATED", "students", studentId, null, Map.of("student_name", student.get("full_name")));
            Json.send(ex, 200, Map.of("message", "Student graduated successfully"));
            return;
        }

        throw new ApiError(404, "Not found");
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