// backend/src/main/java/school/handlers/TeachersHandler.java
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
        String method = ex.getRequestMethod();

        if ("GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> teachers = Database.query(
                    "SELECT id, full_name, email, phone, active FROM users WHERE role = 'teacher' ORDER BY full_name ASC"
            );
            Json.send(ex, 200, teachers);
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            String fullName = (String) body.get("fullName");
            String email = (String) body.get("email");
            String phone = (String) body.get("phone");

            if (fullName == null || fullName.trim().isEmpty()) {
                throw new ApiError(400, "Full name is required");
            }

            String token = generateToken();

            Map<String, Object> res = Database.queryOne(
                    "INSERT INTO users (full_name, email, phone, role, active) VALUES (?, ?, ?, 'teacher', TRUE) RETURNING id",
                    fullName, email, phone
            );
            int teacherId = ((Number) res.get("id")).intValue();

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
        throw new ApiError(405, "Method not allowed");
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