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
            String sql = "SELECT id FROM users WHERE (email = ? OR phone = ?) AND active = TRUE";
            Map<String, Object> row = Database.queryOne(sql, identifier, identifier);

            if (row != null) {
                int userId = ((Number) row.get("id")).intValue();
                String token = generateToken();

                Database.update("INSERT INTO activation_tokens (token, user_id, expires_at) VALUES (?, ?, now() + interval '24 hours')", token, userId);

                String link = Env.get("APP_URL") + "/activate?token=" + token;
                Notifier.notify(userId, "PASSWORD_RESET", Map.of("link", link));
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