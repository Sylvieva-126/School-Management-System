// src/main/java/school/auth/ChangePasswordHandler.java
package school.auth;

import com.sun.net.httpserver.HttpExchange;
import org.mindrot.jbcrypt.BCrypt;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Notifier;

import java.util.Map;

public class ChangePasswordHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireMethod(ex, "POST");
        if (user == null) {
            throw new ApiError(401, "Please log in");
        }

        Map<String, Object> body = Json.parseBody(ex);
        String oldPassword = (String) body.get("oldPassword");
        String newPassword = (String) body.get("newPassword");

        if (oldPassword == null || newPassword == null) {
            throw new ApiError(400, "Old and new passwords are required");
        }

        // FULL complexity policy: 8+ chars, upper, lower, number, special char
        PasswordPolicy.validate(newPassword);

        Map<String, Object> row = Database.queryOne("SELECT password_hash FROM users WHERE id = ?", user.id);
        if (row == null || !BCrypt.checkpw(oldPassword, (String) row.get("password_hash"))) {
            throw new ApiError(400, "Incorrect old password");
        }

        // Reject reusing the current password
        if (BCrypt.checkpw(newPassword, (String) row.get("password_hash"))) {
            throw new ApiError(400, "New password must be different from the old password");
        }

        String hash = BCrypt.hashpw(newPassword, BCrypt.gensalt(12));
        String currentToken = Auth.tokenOf(ex);

        Database.transaction(con -> {
            Database.update(con, "UPDATE users SET password_hash = ?, must_change_password = FALSE WHERE id = ?", hash, user.id);
            Database.update(con, "DELETE FROM session_tokens WHERE user_id = ? AND token != ?", user.id, currentToken);
        });

        Notifier.notify(user.id, "PASSWORD_CHANGED", Map.of());
        AuditLogger.success(user, "PASSWORD_CHANGED", "users", user.id, null, null);

        Json.send(ex, 200, Map.of("message", "Password changed successfully"));
    }
}