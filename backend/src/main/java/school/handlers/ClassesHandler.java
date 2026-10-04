//src/main/java/school/handlers/ClassesHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;

import java.util.List;
import java.util.Map;

public class ClassesHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        String method = ex.getRequestMethod();

        if ("GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> classes = Database.query(
                    "SELECT c.id, c.name, u.full_name as class_teacher_name " +
                            "FROM classes c LEFT JOIN users u ON c.class_teacher_id = u.id ORDER BY c.name ASC"
            );
            Json.send(ex, 200, classes);
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            String name = (String) body.get("name");
            Integer teacherId = body.get("classTeacherId") != null ? ((Number) body.get("classTeacherId")).intValue() : null;

            if (name == null || name.trim().isEmpty()) {
                throw new ApiError(400, "Class name is required");
            }

            try {
                Database.update("INSERT INTO classes (name, class_teacher_id) VALUES (?, ?)", name, teacherId);
                Json.send(ex, 201, Map.of("message", "Class created successfully"));
            } catch (Exception e) {
                if (e.getMessage().contains("duplicate key value")) {
                    throw new ApiError(400, "A class with this name already exists");
                }
                throw e;
            }
            return;
        }
        throw new ApiError(405, "Method not allowed");
    }
}