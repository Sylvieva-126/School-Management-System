// src/main/java/school/handlers/TeachersHandler.java
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

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;

public class TeachersHandler extends SecureHandler {
    private static final SecureRandom random = new SecureRandom();

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if ("/api/teachers".equals(path) && "GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> teachers = Database.query(
                    "SELECT id, full_name, email, phone, active FROM users WHERE role = 'teacher' ORDER BY full_name ASC"
            );
            Json.send(ex, 200, teachers);
            return;
        }

        if ("/api/teachers".equals(path) && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);

            String fullName = body.get("fullName") != null ? ((String) body.get("fullName")).trim() : null;
            String email = body.get("email") != null ? ((String) body.get("email")).trim() : null;
            String phone = body.get("phone") != null ? ((String) body.get("phone")).trim() : null;

            if (fullName == null || fullName.isEmpty()) {
                throw new ApiError(400, "Full name is required");
            }
            if (phone == null || phone.isEmpty()) {
                throw new ApiError(400, "Phone number is required");
            }

            fullName = validateAndFormatName(fullName);

            if (!phone.matches("^\\+?[0-9]{7,15}$")) {
                throw new ApiError(400, "Please enter a valid phone number");
            }

            if (Database.queryOne("SELECT id FROM users WHERE phone = ?", phone) != null) {
                throw new ApiError(400, "This phone number is already registered");
            }

            if (email != null && !email.isEmpty()) {
                if (Database.queryOne("SELECT id FROM users WHERE email = ?", email) != null) {
                    throw new ApiError(400, "This email is already registered");
                }
            } else {
                email = null; // Ensure empty string is stored as NULL
            }

            String token = generateToken();
            int teacherId;

            try {
                Map<String, Object> res = Database.queryOne(
                        "INSERT INTO users (full_name, email, phone, role, active) VALUES (?, ?, ?, 'teacher', TRUE) RETURNING id",
                        fullName, email, phone
                );
                teacherId = ((Number) res.get("id")).intValue();
            } catch (RuntimeException e) {
                if (e.getCause() instanceof java.sql.SQLException) {
                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                    if (state != null && state.startsWith("23505")) {
                        throw new ApiError(400, "This phone number or email is already registered");
                    }
                }
                throw e;
            }

            Database.update("INSERT INTO activation_tokens (token, user_id, expires_at) VALUES (?, ?, now() + interval '24 hours')", token, teacherId);

            String link = Env.get("APP_URL") + "/activate?token=" + token;
            Notifier.notify(teacherId, "ACCOUNT_CREATED", Map.of("link", link, "name", fullName));
            AuditLogger.success(user, "TEACHER_CREATED", "users", teacherId, null, Map.of("name", fullName));

            Json.send(ex, 201, Map.of(
                    "message", "Teacher created successfully",
                    "activationLink", link
            ));
            return;
        }

        // NEW: remove a teacher (deactivates login, kills sessions)
        if (path.matches("/api/teachers/\\d+/deactivate") && "PATCH".equalsIgnoreCase(method)) {
            int teacherId = pathInt(path.split("/")[3]);
            Map<String, Object> t = Database.queryOne(
                    "SELECT id, full_name, active FROM users WHERE id = ? AND role = 'teacher'", teacherId);
            if (t == null) throw new ApiError(404, "Teacher not found");
            if (Boolean.FALSE.equals(t.get("active"))) throw new ApiError(400, "Teacher is already removed");

            Database.transaction(con -> {
                Database.update(con, "UPDATE users SET active = FALSE WHERE id = ?", teacherId);
                Database.update(con, "DELETE FROM session_tokens WHERE user_id = ?", teacherId);
            });

            AuditLogger.success(user, "TEACHER_DEACTIVATED", "users", teacherId, Map.of("active", true), Map.of("active", false));
            Json.send(ex, 200, Map.of("message", "Teacher removed"));
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