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
            Integer teacherId = body.get("teacherId") != null ? ((Number) body.get("teacherId")).intValue() : null;
            Integer classId = body.get("classId") != null ? ((Number) body.get("classId")).intValue() : null;
            Integer subjectId = body.get("subjectId") != null ? ((Number) body.get("subjectId")).intValue() : null;

            if (teacherId == null || classId == null || subjectId == null) {
                throw new ApiError(400, "Teacher, class, and subject are required");
            }

            try {
                Database.update("INSERT INTO teacher_assignments (teacher_id, class_id, subject_id) VALUES (?, ?, ?)", teacherId, classId, subjectId);
                Json.send(ex, 201, Map.of("message", "Assignment created successfully"));
            } catch (Exception e) {
                if (e.getMessage().contains("duplicate key value")) {
                    throw new ApiError(400, "This assignment already exists.");
                }
                throw e;
            }
            return;
        }
        throw new ApiError(405, "Method not allowed");
    }
}