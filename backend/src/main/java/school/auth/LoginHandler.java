//package school.auth;
//
//import com.sun.net.httpserver.HttpExchange;
//import org.mindrot.jbcrypt.BCrypt;
//import school.config.Database;
//import school.http.ApiError;
//import school.http.Json;
//import school.http.RateLimiter;
//import school.http.SecureHandler;
//import school.services.AuditLogger;
//
//import java.util.Map;
//
//public class LoginHandler extends SecureHandler {
//    @Override
//    protected void handleSecure(HttpExchange ex, User user) throws Exception {
//        requireMethod(ex, "POST");
//        String ip = CURRENT_IP.get();
//
//        if (RateLimiter.isLocked(ip)) {
//            throw new ApiError(429, "Too many failed attempts. Please try again in 15 minutes.");
//        }
//
//        Map<String, Object> body = Json.parseBody(ex);
//        String identifier = (String) body.get("identifier");
//        String password = (String) body.get("password");
//
//        if (identifier == null || password == null) {
//            throw new ApiError(400, "Identifier and password are required");
//        }
//
//        String sql = "SELECT * FROM users WHERE (email = ? OR phone = ?) AND active = TRUE";
//        Map<String, Object> row = Database.queryOne(sql, identifier, identifier);
//
//        if (row == null || !BCrypt.checkpw(password, (String) row.get("password_hash"))) {
//            RateLimiter.recordFailure(ip);
//            AuditLogger.blocked(null, "LOGIN_FAILED", null, null, null, null);
//            throw new ApiError(401, "Invalid credentials");
//        }
//
//        RateLimiter.reset(ip);
//
//        // Housekeeping
//        Database.update("DELETE FROM session_tokens WHERE expires_at < now()");
//
//        int userId = ((Number) row.get("id")).intValue();
//        String token = Auth.createToken(userId);
//
//        User loggedInUser = new User();
//        loggedInUser.id = userId;
//        loggedInUser.role = (String) row.get("role");
//
//        AuditLogger.success(loggedInUser, "LOGIN_SUCCESS", "users", userId, null, null);
//
//        Json.send(ex, 200, Map.of(
//                "token", token,
//                "role", row.get("role"),
//                "name", row.get("full_name"),
//                "mustChangePassword", row.get("must_change_password")
//        ));
//    }
//}
package school.auth;

import com.sun.net.httpserver.HttpExchange;
import org.mindrot.jbcrypt.BCrypt;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.RateLimiter;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Notifier;

import java.util.Map;

public class LoginHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireMethod(ex, "POST");

        String ip = CURRENT_IP.get();

        // Rate limiting
        if (RateLimiter.isLocked(ip)) {
            throw new ApiError(429, "Too many failed attempts. Please try again in 15 minutes.");
        }

        Map<String, Object> body = Json.parseBody(ex);
        String identifier = (String) body.get("identifier");
        String password = (String) body.get("password");

        if (identifier == null || password == null) {
            throw new ApiError(400, "Identifier and password are required");
        }

        String sql = "SELECT * FROM users WHERE (email = ? OR phone = ?) AND active = TRUE";
        Map<String, Object> row = Database.queryOne(sql, identifier, identifier);

        if (row == null || !BCrypt.checkpw(password, (String) row.get("password_hash"))) {
            RateLimiter.recordFailure(ip);
            AuditLogger.blocked(null, "LOGIN_FAILED", null, null, null, null);
            throw new ApiError(401, "Invalid credentials");
        }

        RateLimiter.reset(ip);

        // Housekeeping: Delete expired tokens
        Database.update("DELETE FROM session_tokens WHERE expires_at < now()");

        int userId = ((Number) row.get("id")).intValue();
        String token = Auth.createToken(userId);

        User loggedInUser = new User();
        loggedInUser.id = userId;
        loggedInUser.role = (String) row.get("role");
        loggedInUser.fullName = (String) row.get("full_name");

        AuditLogger.success(loggedInUser, "LOGIN_SUCCESS", "users", userId, null, null);

//        Map<String, Object> mustChange = row.get("must_change_password");

        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("token", token);
        response.put("role", row.get("role"));
        response.put("name", row.get("full_name"));
        response.put("mustChangePassword", row.get("must_change_password"));

        Json.send(ex, 200, response);

        // ✅ PASSWORD_CHANGED notification AFTER successful login response
        // (This is safe — outside transaction, user exists)
        Notifier.notify(userId, "PASSWORD_CHANGED",
                java.util.Map.of("name", loggedInUser.fullName != null ? loggedInUser.fullName : ""));
    }
}