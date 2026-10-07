// backend/src/main/java/school/services/Stats.java
package school.services;

import school.config.Database;

import java.util.Map;

public class Stats {
    public static double attendancePercentage(int studentId) {
        Map<String, Object> row = Database.queryOne(
                "SELECT " +
                        "COUNT(*) as total_days, " +
                        "COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as present_days " +
                        "FROM attendance WHERE student_id = ?",
                studentId
        );

        if (row == null) return 0.0;

        long totalDays = ((Number) row.get("total_days")).longValue();
        if (totalDays == 0) return 0.0;

        long presentDays = ((Number) row.get("present_days")).longValue();
        return Math.round((100.0 * presentDays / totalDays) * 10.0) / 10.0;
    }

    public static double teacherAttendancePercentage(int userId) {
        Map<String, Object> row = Database.queryOne(
                "SELECT " +
                        "COUNT(*) as total_days, " +
                        "COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days " +
                        "FROM teacher_attendance WHERE teacher_id = ?",
                userId
        );

        if (row == null) return 0.0;

        long totalDays = ((Number) row.get("total_days")).longValue();
        if (totalDays == 0) return 0.0;

        long presentDays = ((Number) row.get("present_days")).longValue();
        return Math.round((100.0 * presentDays / totalDays) * 10.0) / 10.0;
    }
}
//attendance tsts for teacher and student