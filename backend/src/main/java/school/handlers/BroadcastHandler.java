// backend/src/main/java/school/handlers/BroadcastHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Notifier;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class BroadcastHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if ("/api/broadcast/preview".equals(path) && "GET".equalsIgnoreCase(method)) {
            String query = ex.getRequestURI().getQuery();
            String audience = "";
            String value = "";

            if (query != null) {
                for (String param : query.split("&")) {
                    String[] pair = param.split("=");
                    if (pair.length == 2) {
                        if (pair[0].equals("audience")) audience = URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
                        if (pair[0].equals("value")) value = URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
                    }
                }
            }

            List<Map<String, Object>> recipients = getRecipients(audience, value);
            int smsCount = 0;
            for (Map<String, Object> r : recipients) {
                String phone = (String) r.get("phone");
                if (phone != null && !phone.trim().isEmpty()) {
                    smsCount++;
                }
            }

            Json.send(ex, 200, Map.of("recipients", recipients.size(), "smsCount", smsCount));
            return;
        }

        if ("/api/broadcast".equals(path) && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            String audience = (String) body.get("audience");
            String value = (String) body.get("value");
            String title = (String) body.get("title");
            String message = (String) body.get("message");
            Boolean alsoSms = (Boolean) body.get("alsoSms");

            if (audience == null || title == null || message == null || title.trim().isEmpty() || message.trim().isEmpty()) {
                throw new ApiError(400, "Audience, title, and message are required");
            }

            if (message.length() > 1000) {
                throw new ApiError(400, "Message cannot exceed 1000 characters");
            }

            List<Map<String, Object>> recipients = getRecipients(audience, value);
            List<String> channels = Boolean.TRUE.equals(alsoSms) ? List.of("email", "sms") : List.of("email");

            for (Map<String, Object> r : recipients) {
                int recipientId = ((Number) r.get("id")).intValue();
                Notifier.notify(recipientId, "ANNOUNCEMENT", Map.of("message", message), channels);
            }

            AuditLogger.success(user, "BROADCAST_SENT", null, null, null, Map.of(
                    "audience", audience,
                    "value", value,
                    "count", recipients.size(),
                    "alsoSms", alsoSms
            ));

            Json.send(ex, 200, Map.of("message", "Broadcast sent to " + recipients.size() + " recipients"));
            return;
        }

        throw new ApiError(404, "Not found");
    }

    private List<Map<String, Object>> getRecipients(String audience, String value) {
        if ("all".equals(audience)) {
            return Database.query("SELECT id, phone FROM users WHERE active = TRUE");
        } else if ("role".equals(audience)) {
            return Database.query("SELECT id, phone FROM users WHERE role = ? AND active = TRUE", value);
        } else if ("class".equals(audience)) {
            try {
                int classId = Integer.parseInt(value);
                return Database.query(
                        "SELECT DISTINCT u.id, u.phone FROM users u " +
                                "JOIN parent_links p ON u.id = p.parent_user_id " +
                                "JOIN students s ON p.student_id = s.id " +
                                "WHERE s.class_id = ? AND u.active = TRUE",
                        classId
                );
            } catch (NumberFormatException e) {
                return new ArrayList<>();
            }
        }
        return new ArrayList<>();
    }
}