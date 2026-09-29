// backend/src/main/java/school/handlers/AdminManagementHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;

import java.util.List;
import java.util.Map;

public class AdminManagementHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        // G1: Only super_admin may touch /api/admins/*
        if (!"super_admin".equals(user.role)) {
            AuditLogger.blocked(user, "ADMIN_ACTION", "users", null, null, null);
            throw new ApiError(403, "You are not allowed to do this");
        }

        String path = rest(ex);
        String method = ex.getRequestMethod();

        if ("/list".equals(path) && "GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> admins = Database.query(
                    "SELECT id, full_name, email, phone, role, active, created_at FROM users WHERE role IN ('admin', 'super_admin') ORDER BY id ASC"
            );
            Json.send(ex, 200, admins);
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            String[] parts = path.split("/");
            if (parts.length == 3) {
                String action = parts[1];
                int targetId = pathInt(parts[2]);

                Map<String, Object> targetUser = Database.queryOne("SELECT * FROM users WHERE id = ?", targetId);
                if (targetUser == null) {
                    throw new ApiError(404, "User not found");
                }

                // G3: Cannot remove own account
                if (targetId == user.id) {
                    AuditLogger.blocked(user, action.toUpperCase() + "_ADMIN", "users", targetId, null, null);
                    throw new ApiError(400, "You cannot remove your own account.");
                }

                // G3: Super admin accounts cannot be removed via this route
                if ("super_admin".equals(targetUser.get("role"))) {
                    AuditLogger.blocked(user, action.toUpperCase() + "_ADMIN", "users", targetId, null, null);
                    throw new ApiError(400, "Super admin accounts cannot be removed via this route.");
                }

                // G2: Check if last admin before demote/delete
                if ("demote".equals(action) || "delete".equals(action)) {
                    long count = ((Number) Database.queryOne(
                            "SELECT COUNT(*) as c FROM users WHERE role IN ('admin', 'super_admin') AND active = TRUE AND id != ?", targetId
                    ).get("c")).longValue();

                    if (count == 0) {
                        AuditLogger.blocked(user, action.toUpperCase() + "_ADMIN", "users", targetId, null, null);
                        throw new ApiError(400, targetUser.get("full_name") + " is the last admin. Promote someone else first.");
                    }
                }

                Map<String, Object> oldRole = Map.of("role", targetUser.get("role"), "active", targetUser.get("active"));

                if ("promote".equals(action)) {
                    Database.update("UPDATE users SET role = 'admin' WHERE id = ?", targetId);
                    Map<String, Object> newRole = Map.of("role", "admin", "active", targetUser.get("active"));
                    AuditLogger.success(user, "PROMOTE_ADMIN", "users", targetId, oldRole, newRole);
                    Json.send(ex, 200, Map.of("message", "User promoted to admin"));
                    return;
                }
                else if ("demote".equals(action)) {
                    Database.transaction(con -> {
                        Database.update(con, "UPDATE users SET role = 'teacher' WHERE id = ?", targetId);
                    });
                    Map<String, Object> newRole = Map.of("role", "teacher", "active", targetUser.get("active"));
                    AuditLogger.success(user, "DEMOTE_ADMIN", "users", targetId, oldRole, newRole);
                    Json.send(ex, 200, Map.of("message", "Admin demoted to teacher"));
                    return;
                }
                else if ("delete".equals(action)) {
                    Database.transaction(con -> {
                        Database.update(con, "UPDATE users SET active = FALSE WHERE id = ?", targetId);
                        Database.update(con, "DELETE FROM session_tokens WHERE user_id = ?", targetId);
                    });
                    Map<String, Object> newRole = Map.of("role", targetUser.get("role"), "active", false);
                    AuditLogger.success(user, "DELETE_ADMIN", "users", targetId, oldRole, newRole);
                    Json.send(ex, 200, Map.of("message", "Admin account deactivated"));
                    return;
                }
            }
        }
        throw new ApiError(404, "Not found");
    }
}