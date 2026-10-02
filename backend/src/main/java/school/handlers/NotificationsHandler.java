// backend/src/main/java/school/handlers/NotificationsHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;

import java.util.List;
import java.util.Map;

public class NotificationsHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if ("/api/notifications".equals(path) && "GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> notifications = Database.query(
                    "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30",
                    user.id
            );
            Json.send(ex, 200, notifications);
            return;
        }

        if ("/api/notifications/unread-count".equals(path) && "GET".equalsIgnoreCase(method)) {
            Map<String, Object> row = Database.queryOne(
                    "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE",
                    user.id
            );
            Json.send(ex, 200, Map.of("count", row.get("count")));
            return;
        }

        if (path.startsWith("/api/notifications/read/") && "POST".equalsIgnoreCase(method)) {
            int id = pathInt(path.replace("/api/notifications/read/", ""));

            int updated = Database.update(
                    "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
                    id, user.id
            );

            if (updated == 0) {
                throw new ApiError(404, "Notification not found");
            }

            Json.send(ex, 200, Map.of("message", "Marked as read"));
            return;
        }

        throw new ApiError(404, "Not found");
    }
}