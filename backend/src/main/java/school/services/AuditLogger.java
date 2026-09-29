package school.services;

import com.google.gson.Gson;
import school.auth.User;
import school.config.Database;
import school.http.SecureHandler;

public class AuditLogger {
    private static final Gson gson = new Gson();

    public static void log(User actor, String action, String targetType, Integer targetId, Object oldValue, Object newValue, String status) {
        String oldJson = oldValue == null ? null : gson.toJson(oldValue);
        String newJson = newValue == null ? null : gson.toJson(newValue);
        Integer actorId = actor == null ? null : actor.id;
        String actorRole = actor == null ? null : actor.role;
        String ip = SecureHandler.CURRENT_IP.get();

        String sql = "INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, old_value, new_value, ip_address, status) " +
                "VALUES (?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?)";

        Database.update(sql, actorId, actorRole, action, targetType, targetId, oldJson, newJson, ip, status);
    }

    public static void success(User actor, String action, String targetType, Integer targetId, Object oldValue, Object newValue) {
        log(actor, action, targetType, targetId, oldValue, newValue, "success");
    }

    public static void blocked(User actor, String action, String targetType, Integer targetId, Object oldValue, Object newValue) {
        log(actor, action, targetType, targetId, oldValue, newValue, "blocked");
    }
}