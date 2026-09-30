// backend/src/main/java/school/handlers/TeacherAttendanceHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Stats;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class TeacherAttendanceHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if (path.equals("/api/teacher-attendance/mark") && "POST".equalsIgnoreCase(method)) {
            requireRole(user, "teacher");
            Map<String, Object> body = Json.parseBody(ex);
            String status = (String) body.get("status");

            if (!"present".equals(status) && !"absent".equals(status)) {
                throw new ApiError(400, "Status must be 'present' or 'absent'");
            }

            String today = LocalDate.now().toString();

            Database.update(
                    "INSERT INTO teacher_attendance (teacher_id, date, status) VALUES (?, ?::date, ?) " +
                            "ON CONFLICT (teacher_id, date) DO UPDATE SET status = EXCLUDED.status",
                    user.id, today, status
            );

            AuditLogger.success(user, "TEACHER_SELF_MARKED", "teacher_attendance", null, null, Map.of("date", today, "status", status));
            Json.send(ex, 200, Map.of("message", "Attendance marked successfully"));
            return;
        }

        if (path.equals("/api/teacher-attendance/me") && "GET".equalsIgnoreCase(method)) {
            requireRole(user, "teacher");
            List<Map<String, Object>> records = Database.query(
                    "SELECT date, status FROM teacher_attendance " +
                            "WHERE teacher_id = ? AND date >= current_date - interval '30 days' ORDER BY date DESC",
                    user.id
            );
            double percentage = Stats.teacherAttendancePercentage(user.id);
            Json.send(ex, 200, Map.of("records", records, "percentage", percentage));
            return;
        }

        if (path.equals("/api/teacher-attendance/summary") && "GET".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin");
            List<Map<String, Object>> rawSummary = Database.query(
                    "SELECT u.id, u.full_name, " +
                            "COUNT(ta.id) as total_days, " +
                            "COUNT(CASE WHEN ta.status = 'present' THEN 1 END) as present_days, " +
                            "COUNT(CASE WHEN ta.status = 'absent' THEN 1 END) as absent_days " +
                            "FROM users u " +
                            "LEFT JOIN teacher_attendance ta ON u.id = ta.teacher_id " +
                            "AND date_trunc('month', ta.date) = date_trunc('month', current_date) " +
                            "WHERE u.role = 'teacher' AND u.active = TRUE " +
                            "GROUP BY u.id, u.full_name " +
                            "ORDER BY u.full_name ASC"
            );

            List<Map<String, Object>> summary = new ArrayList<>();
            for (Map<String, Object> row : rawSummary) {
                long totalDays = ((Number) row.get("total_days")).longValue();
                long presentDays = ((Number) row.get("present_days")).longValue();
                double percentage = totalDays == 0 ? 0.0 : Math.round((100.0 * presentDays / totalDays) * 10.0) / 10.0;

                summary.add(Map.of(
                        "id", row.get("id"),
                        "fullName", row.get("full_name"),
                        "presentDays", presentDays,
                        "absentDays", row.get("absent_days"),
                        "percentage", percentage
                ));
            }
            Json.send(ex, 200, summary);
            return;
        }

        if (path.equals("/api/teacher-attendance/today") && "GET".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin");
            List<Map<String, Object>> todayStatus = Database.query(
                    "SELECT u.id, u.full_name, ta.status " +
                            "FROM users u " +
                            "LEFT JOIN teacher_attendance ta ON u.id = ta.teacher_id AND ta.date = current_date " +
                            "WHERE u.role = 'teacher' AND u.active = TRUE " +
                            "ORDER BY u.full_name ASC"
            );
            Json.send(ex, 200, todayStatus);
            return;
        }

        throw new ApiError(404, "Not found");
    }
}