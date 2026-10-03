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
        requireMethod(ex, "GET");

        String path = ex.getRequestURI().getPath();

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

        if (path.startsWith("/api/teacher/class/") && path.endsWith("/students")) {
            int classId = pathInt(path.replace("/api/teacher/class/", "").replace("/students", ""));

            Map<String, Object> assignment = Database.queryOne("SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?", user.id, classId);
            if (assignment == null) throw new ApiError(403, "This is not your class");

            List<Map<String, Object>> students = Database.query(
                    "SELECT id, full_name, admission_no FROM students WHERE class_id = ? AND graduated = FALSE ORDER BY full_name ASC",
                    classId
            );
            Json.send(ex, 200, students);
            return;
        }

        throw new ApiError(404, "Not found");
    }
}