// backend/src/main/java/school/handlers/AuditLogHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.QueryParser;
import school.http.SecureHandler;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class AuditLogHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin");
        requireMethod(ex, "GET");

        Map<String, String> query = QueryParser.parse(ex.getRequestURI().getQuery());
        String status = query.getOrDefault("status", "");
        String action = query.getOrDefault("action", "");
        String actor = query.getOrDefault("actor", "");
        String q = query.getOrDefault("q", "");

        int page = 1;
        try {
            page = Integer.parseInt(query.getOrDefault("page", "1"));
        } catch (NumberFormatException ignored) {}

        int limit = 50;
        int offset = (page - 1) * limit;

        StringBuilder sql = new StringBuilder("SELECT * FROM audit_logs WHERE 1=1 ");
        StringBuilder countSql = new StringBuilder("SELECT COUNT(*) as c FROM audit_logs WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (!status.isEmpty()) {
            sql.append("AND status = ? ");
            countSql.append("AND status = ? ");
            params.add(status);
        }
        if (!action.isEmpty()) {
            sql.append("AND action = ? ");
            countSql.append("AND action = ? ");
            params.add(action);
        }
        if (!actor.isEmpty()) {
            sql.append("AND actor_role = ? ");
            countSql.append("AND actor_role = ? ");
            params.add(actor);
        }
        if (!q.isEmpty()) {
            sql.append("AND (target_type ILIKE ? OR old_value::text ILIKE ? OR new_value::text ILIKE ?) ");
            countSql.append("AND (target_type ILIKE ? OR old_value::text ILIKE ? OR new_value::text ILIKE ?) ");
            String likePattern = "%" + q + "%";
            params.add(likePattern);
            params.add(likePattern);
            params.add(likePattern);
        }

        sql.append("ORDER BY id DESC LIMIT ? OFFSET ?");

        List<Object> listParams = new ArrayList<>(params);
        listParams.add(limit);
        listParams.add(offset);

        List<Map<String, Object>> items = Database.query(sql.toString(), listParams.toArray());
        long total = ((Number) Database.queryOne(countSql.toString(), params.toArray()).get("c")).longValue();

        Json.send(ex, 200, Map.of(
                "items", items,
                "total", total,
                "page", page,
                "pages", (int) Math.ceil((double) total / limit)
        ));
    }
}