// backend/src/main/java/school/handlers/TeacherPortalHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.Stats;

import java.util.List;
import java.util.Map;

public class TeacherPortalHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "teacher");
        String path = ex.getRequestURI().getPath();
        requireMethod(ex, "GET");

        if ("/api/teacher/my-classes".equals(path)) {
            List<Map<String, Object>> classes = Database.query(
                    "SELECT DISTINCT c.id as class_id, c.name as class_name, s.id as subject_id, s.name as subject_name " +
                            "FROM teacher_assignments ta " +
                            "JOIN classes c ON ta.class_id = c.id " +
                            "JOIN subjects s ON ta.subject_id = s.id " +
                            "WHERE ta.teacher_id = ? ORDER BY c.name ASC, s.name ASC",
                    user.id
            );
            Json.send(ex, 200, classes);
            return;
        }

        if ("/api/teacher/my-timetable".equals(path)) {
            List<Map<String, Object>> timetable = Database.query(
                    "SELECT t.*, c.name as class_name, s.name as subject_name " +
                            "FROM timetable t " +
                            "JOIN classes c ON t.class_id = c.id " +
                            "JOIN subjects s ON t.subject_id = s.id " +
                            "WHERE t.teacher_id = ? ORDER BY t.day_of_week, t.start_time",
                    user.id
            );
            Json.send(ex, 200, timetable);
            return;
        }

        if ("/api/teacher/my-attendance".equals(path)) {
            List<Map<String, Object>> records = Database.query(
                    "SELECT date, status FROM teacher_attendance " +
                            "WHERE teacher_id = ? AND date >= current_date - interval '30 days' ORDER BY date DESC",
                    user.id
            );
            double percentage = Stats.teacherAttendancePercentage(user.id);
            Json.send(ex, 200, Map.of("records", records, "percentage", percentage));
            return;
        }

        throw new ApiError(404, "Not found");
    }
}