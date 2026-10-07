package school.auth;

import com.sun.net.httpserver.HttpExchange;
import school.config.Database;

import java.security.SecureRandom;
import java.util.Map;

public class Auth {
    private static final SecureRandom random = new SecureRandom();

    public static User authenticate(HttpExchange ex) {
        String token = tokenOf(ex);
        if (token == null) return null;

        String sql = "SELECT u.* FROM users u " +
                "JOIN session_tokens st ON u.id = st.user_id " +
                "WHERE st.token = ? AND st.expires_at > now() AND u.active = TRUE";
//if token exsist and not expired the account is live
        Map<String, Object> row = Database.queryOne(sql, token);
        if (row == null) return null;

        User user = new User();
        user.id = ((Number) row.get("id")).intValue();
        user.fullName = (String) row.get("full_name");
        user.role = (String) row.get("role");
        user.phone = (String) row.get("phone");
        user.email = (String) row.get("email");
        user.passwordHash = (String) row.get("password_hash");
        user.mustChangePassword = (Boolean) row.get("must_change_password");
        return user;
    }

    public static String createToken(int userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        String token = sb.toString();

        Database.update("INSERT INTO session_tokens (token, user_id, expires_at) VALUES (?, ?, now() + interval '7 days')", token, userId);
        return token;
    }
    //generate random cryptographic sessions


    public static String tokenOf(HttpExchange ex) {
        String authHeader = ex.getRequestHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return null;
    }
    //to remove bearer prefix
}
//post login , login in takes details , auth.create token  gives key cad session records th where we access, auth.authenticate reads ur sesssion , sql checkif it's active expired and exsisis some are requre role