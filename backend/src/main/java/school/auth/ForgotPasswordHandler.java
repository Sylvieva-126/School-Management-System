// src/main/java/school/auth/ForgotPasswordHandler.java
package school.auth;

import com.sun.net.httpserver.HttpExchange;
import school.config.Database;
import school.config.Env;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.Notifier;

import java.security.SecureRandom;
import java.util.Map;

public class ForgotPasswordHandler extends SecureHandler {
    private static final SecureRandom random = new SecureRandom();

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireMethod(ex, "POST");
        Map<String, Object> body = Json.parseBody(ex);
        String identifier = (String) body.get("identifier");

        if (identifier != null && !identifier.trim().isEmpty()) {
            String id = identifier.trim();

            // Match by email OR phone OR admission number (students may try their admission no)
            String sql = "SELECT u.id, u.full_name, u.email, u.phone, u.role FROM users u " +
                    "LEFT JOIN students s ON s.user_id = u.id " +
                    "WHERE (u.email = ? OR u.phone = ? OR s.admission_no = ?) AND u.active = TRUE";
            Map<String, Object> row = Database.queryOne(sql, id, id, id);

            if (row != null) {
                String email = row.get("email") == null ? null : row.get("email").toString().trim();
                String phone = row.get("phone") == null ? null : row.get("phone").toString().trim();

                if ((email == null || email.isEmpty()) && (phone == null || phone.isEmpty())) {
                    // e.g. a STUDENT: no channel exists to deliver a self-service reset.
                    // Respond honestly so the UI can guide them (admin generates the link instead).
                    Json.send(ex, 200, Map.of(
                            "message", "This account has no email or phone on file. Please ask the school office to reset your password."
                    ));
                    return;
                }

                int userId = ((Number) row.get("id")).intValue();
                String token = generateToken();

                Database.update("INSERT INTO activation_tokens (token, user_id, expires_at) VALUES (?, ?, now() + interval '24 hours')", token, userId);

                String link = Env.get("APP_URL") + "/activate?token=" + token;
                String name = row.get("full_name") != null ? row.get("full_name").toString() : "";
                Notifier.notify(userId, "PASSWORD_RESET", Map.of("link", link, "name", name));
            }
        }

        // Always return 200 to prevent user enumeration
        Json.send(ex, 200, Map.of("message", "If the account exists, a reset link has been sent."));
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