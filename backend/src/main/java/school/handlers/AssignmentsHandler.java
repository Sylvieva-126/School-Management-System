// backend/src/main/java/school/handlers/AssignmentsHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;

import java.util.List;
import java.util.Map;

public class AssignmentsHandler extends SecureHandler {

    private static int asInt(Object value) {
        if (value == null) throw new ApiError(400, "Missing required number field");
        if (value instanceof Number) return ((Number) value).intValue();
        if (value instanceof String) {
            try {
                return Integer.parseInt(((String) value).trim());
            } catch (NumberFormatException e) {
                throw new ApiError(400, "Expected a number");
            }
        }
        throw new ApiError(400, "Expected a number");
    }

    private void verifyExists(String table, int id, String entityName) {
        Map<String, Object> row = Database.queryOne("SELECT 1 FROM " + table + " WHERE id = ?", id);
        if (row == null) {
            throw new ApiError(400, entityName + " with id " + id + " does not exist");
        }
    }

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        String method = ex.getRequestMethod();

        if ("GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> assignments = Database.query(
                    "SELECT ta.id, u.full_name as teacher_name, c.name as class_name, s.name as subject_name " +
                            "FROM teacher_assignments ta " +
                            "JOIN users u ON ta.teacher_id = u.id " +
                            "JOIN classes c ON ta.class_id = c.id " +
                            "JOIN subjects s ON ta.subject_id = s.id " +
                            "ORDER BY c.name ASC, s.name ASC"
            );
            Json.send(ex, 200, assignments);
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);

            int teacherId = asInt(body.get("teacherId"));
            int classId = asInt(body.get("classId"));
            int subjectId = asInt(body.get("subjectId"));

            verifyExists("users", teacherId, "Teacher");
            verifyExists("classes", classId, "Class");
            verifyExists("subjects", subjectId, "Subject");

            try {
                Database.update("INSERT INTO teacher_assignments (teacher_id, class_id, subject_id) VALUES (?, ?, ?)", teacherId, classId, subjectId);
                Json.send(ex, 201, Map.of("message", "Assignment created successfully"));
            } catch (RuntimeException e) {
                if (e.getCause() instanceof java.sql.SQLException) {
                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                    if (state != null && state.startsWith("23503")) {
                        throw new ApiError(400, "One of the referenced records does not exist");
                    }
                }
                if (e.getMessage() != null && e.getMessage().contains("duplicate key value")) {
                    throw new ApiError(400, "This assignment already exists.");
                }
                throw e;
            }
            return;
        }
        throw new ApiError(405, "Method not allowed");
    }
}