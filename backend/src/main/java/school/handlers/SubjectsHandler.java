// src/main/java/school/handlers/SubjectsHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;

import java.util.List;
import java.util.Map;

public class SubjectsHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        String method = ex.getRequestMethod();

        if ("GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> subjects = Database.query("SELECT id, name FROM subjects ORDER BY name ASC");
            Json.send(ex, 200, subjects);
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            String name = (String) body.get("name");

            if (name == null || name.trim().isEmpty()) {
                throw new ApiError(400, "Subject name is required");
            }

            //  reject duplicate subject names (case-insensitive)
            if (Database.queryOne("SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)", name.trim()) != null) {
                throw new ApiError(409, "Subject already exists");
            }

            Database.update("INSERT INTO subjects (name) VALUES (?)", name.trim());
            Json.send(ex, 201, Map.of("message", "Subject created successfully"));
            return;
        }
        throw new ApiError(405, "Method not allowed");
    }
}