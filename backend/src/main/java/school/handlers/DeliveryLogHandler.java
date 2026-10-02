// backend/src/main/java/school/handlers/DeliveryLogHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public class DeliveryLogHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if ("/api/deliveries".equals(path) && "GET".equalsIgnoreCase(method)) {
            String query = ex.getRequestURI().getQuery();
            String status = "";
            String channel = "";
            int page = 1;
            int limit = 50;

            if (query != null) {
                for (String param : query.split("&")) {
                    String[] pair = param.split("=");
                    if (pair.length == 2) {
                        if (pair[0].equals("status")) status = URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
                        if (pair[0].equals("channel")) channel = URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
                        if (pair[0].equals("page")) page = Integer.parseInt(pair[1]);
                    }
                }
            }

            int offset = (page - 1) * limit;

            StringBuilder sql = new StringBuilder(
                    "SELECT d.*, u.full_name as user_name " +
                            "FROM notification_deliveries d JOIN users u ON d.user_id = u.id WHERE 1=1"
            );
            StringBuilder countSql = new StringBuilder("SELECT COUNT(*) as c FROM notification_deliveries d WHERE 1=1");

            List<Object> params = new java.util.ArrayList<>();

            if (!status.isEmpty()) {
                sql.append(" AND d.status = ?");
                countSql.append(" AND d.status = ?");
                params.add(status);
            }
            if (!channel.isEmpty()) {
                sql.append(" AND d.channel = ?");
                countSql.append(" AND d.channel = ?");
                params.add(channel);
            }

            sql.append(" ORDER BY d.id DESC LIMIT ? OFFSET ?");

            List<Object> queryParams = new java.util.ArrayList<>(params);
            queryParams.add(limit);
            queryParams.add(offset);

            List<Map<String, Object>> items = Database.query(sql.toString(), queryParams.toArray());
            long total = ((Number) Database.queryOne(countSql.toString(), params.toArray()).get("c")).longValue();

            Json.send(ex, 200, Map.of(
                    "items", items,
                    "total", total,
                    "page", page,
                    "pages", (int) Math.ceil((double) total / limit)
            ));
            return;
        }

        if ("/api/deliveries/summary".equals(path) && "GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> summary = Database.query(
                    "SELECT channel, status, COUNT(*) as count " +
                            "FROM notification_deliveries " +
                            "WHERE date_trunc('month', created_at) = date_trunc('month', current_date) " +
                            "GROUP BY channel, status"
            );
            Json.send(ex, 200, summary);
            return;
        }

        throw new ApiError(404, "Not found");
    }
}