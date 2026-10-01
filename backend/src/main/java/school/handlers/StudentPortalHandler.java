// backend/src/main/java/school/handlers/StudentPortalHandler.java
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

public class StudentPortalHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "student");
        requireMethod(ex, "GET");

        String path = ex.getRequestURI().getPath();
        System.out.println("StudentPortalHandler received: " + path);

        // Get the student ID associated with this user
        Map<String, Object> studentRow = Database.queryOne("SELECT id, class_id FROM students WHERE user_id = ?", user.id);
        if (studentRow == null) {
            throw new ApiError(404, "Student record not found for this user");
        }
        int studentId = ((Number) studentRow.get("id")).intValue();
        Integer classId = studentRow.get("class_id") != null ? ((Number) studentRow.get("class_id")).intValue() : null;

        if ("/api/student/me/results".equals(path)) {
            List<Map<String, Object>> results = Database.query(
                    "SELECT r.*, e.name as exam_name, s.name as subject_name, t.name as term_name " +
                            "FROM results r " +
                            "JOIN exams e ON r.exam_id = e.id " +
                            "JOIN subjects s ON e.subject_id = s.id " +
                            "JOIN terms t ON e.term_id = t.id " +
                            "WHERE r.student_id = ? AND e.published = TRUE " +
                            "ORDER BY e.id DESC",
                    studentId
            );
            Json.send(ex, 200, results);
            return;
        }

        if ("/api/student/me/attendance-percentage".equals(path)) {
            double percentage = Stats.attendancePercentage(studentId);
            Json.send(ex, 200, Map.of("percentage", percentage));
            return;
        }

        if ("/api/student/me/fees".equals(path)) {
            List<Map<String, Object>> fees = Database.query(
                    "SELECT i.*, t.name as term_name " +
                            "FROM invoices i " +
                            "JOIN terms t ON i.term_id = t.id " +
                            "WHERE i.student_id = ? " +
                            "ORDER BY i.id DESC",
                    studentId
            );
            Json.send(ex, 200, fees);
            return;
        }

        if ("/api/student/me/timetable".equals(path)) {
            if (classId == null) {
                Json.send(ex, 200, List.of());
                return;
            }
            List<Map<String, Object>> timetable = Database.query(
                    "SELECT t.*, c.name as class_name, u.full_name as teacher_name, s.name as subject_name " +
                            "FROM timetable t " +
                            "JOIN classes c ON t.class_id = c.id " +
                            "JOIN users u ON t.teacher_id = u.id " +
                            "JOIN subjects s ON t.subject_id = s.id " +
                            "WHERE t.class_id = ? " +
                            "ORDER BY t.day_of_week, t.start_time",
                    classId
            );
            Json.send(ex, 200, timetable);
            return;
        }

        throw new ApiError(404, "Not found");
    }
}