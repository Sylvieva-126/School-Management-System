// src/main/java/school/auth/ActivateHandler.java
package school.auth;

import com.sun.net.httpserver.HttpExchange;
import org.mindrot.jbcrypt.BCrypt;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;

import java.util.Map;

public class ActivateHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireMethod(ex, "POST");
        Map<String, Object> body = Json.parseBody(ex);
        String token = (String) body.get("token");
        String password = (String) body.get("password");

        if (token == null || password == null) {
            throw new ApiError(400, "Token and password are required");
        }

        // FULL complexity policy: 8+ chars, upper, lower, number, special char
        PasswordPolicy.validate(password);

        String sql = "SELECT user_id FROM activation_tokens WHERE token = ? AND used = FALSE AND expires_at > now()";
        Map<String, Object> tokenRow = Database.queryOne(sql, token);

        if (tokenRow == null) {
            throw new ApiError(400, "This activation link is invalid or expired");
        }

        int userId = ((Number) tokenRow.get("user_id")).intValue();
        String hash = BCrypt.hashpw(password, BCrypt.gensalt(12));

        Database.transaction(con -> {
            Database.update(con, "UPDATE users SET password_hash = ?, must_change_password = FALSE WHERE id = ?", hash, userId);
            Database.update(con, "UPDATE activation_tokens SET used = TRUE WHERE token = ?", token);
            Database.update(con, "DELETE FROM session_tokens WHERE user_id = ?", userId);
        });

        User target = new User();
        target.id = userId;
        AuditLogger.success(target, "ACCOUNT_ACTIVATED", "users", userId, null, null);

        Json.send(ex, 200, Map.of("message", "Account activated successfully. You can now log in."));
    }
}