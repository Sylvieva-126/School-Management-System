// backend/src/main/java/school/handlers/AttendanceHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Notifier;
import school.services.Stats;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class AttendanceHandler extends SecureHandler {

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
        requireRole(user, "super_admin", "admin", "teacher");
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if (path.startsWith("/api/attendance/class/") && path.endsWith("/percentage") && "GET".equalsIgnoreCase(method)) {
            int classId = pathInt(path.replace("/api/attendance/class/", "").replace("/percentage", ""));

            if ("teacher".equals(user.role)) {
                Map<String, Object> assignment = Database.queryOne("SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?", user.id, classId);
                if (assignment == null) throw new ApiError(403, "This is not your class");
            }

            List<Map<String, Object>> students = Database.query("SELECT id, full_name, admission_no FROM students WHERE class_id = ? AND graduated = FALSE ORDER BY full_name ASC", classId);
            List<Map<String, Object>> result = new ArrayList<>();

            for (Map<String, Object> s : students) {
                int studentId = ((Number) s.get("id")).intValue();
                double percentage = Stats.attendancePercentage(studentId);
                result.add(Map.of(
                        "studentId", studentId,
                        "studentName", s.get("full_name"),
                        "admissionNo", s.get("admission_no"),
                        "percentage", percentage
                ));
            }
            Json.send(ex, 200, result);
            return;
        }

        if ("/api/attendance".equals(path) && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);

            final int classId = asInt(body.get("classId"));
            final String dateStr = (String) body.get("date");
            final int userId = user.id;

            @SuppressWarnings("unchecked")
            final List<Map<String, Object>> records = (List<Map<String, Object>>) body.get("records");

            if (dateStr == null || records == null) {
                throw new ApiError(400, "Class ID, date, and records are required");
            }

            try {
                LocalDate.parse(dateStr);
            } catch (DateTimeParseException e) {
                throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
            }

            verifyExists("classes", classId, "Class");

            if ("teacher".equals(user.role)) {
                Map<String, Object> assignment = Database.queryOne("SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?", userId, classId);
                if (assignment == null) throw new ApiError(403, "This is not your class");
            }

            Map<String, Object> activeTerm = Database.queryOne("SELECT closed FROM terms WHERE active = TRUE");
            if (activeTerm == null) throw new ApiError(400, "No active term found");
            if (Boolean.TRUE.equals(activeTerm.get("closed"))) {
                throw new ApiError(400, "This term is closed.");
            }

            try {
                Database.transaction(con -> {
                    for (Map<String, Object> record : records) {
                        int studentId = asInt(record.get("studentId"));
                        String status = (String) record.get("status");

                        if (!"present".equals(status) && !"absent".equals(status) && !"late".equals(status)) {
                            throw new ApiError(400, "Status must be 'present' or 'absent'");
                        }

                        Map<String, Object> studentCheck = Database.queryOne(con, "SELECT 1 FROM students WHERE id = ?", studentId);
                        if (studentCheck == null) {
                            throw new ApiError(400, "Student with id " + studentId + " does not exist");
                        }

                        Database.update(con,
                                "INSERT INTO attendance (student_id, class_id, date, status, marked_by) VALUES (?, ?, ?::date, ?, ?) " +
                                        "ON CONFLICT (student_id, date) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by",
                                studentId, classId, dateStr, status, userId
                        );

                        if ("absent".equals(status)) {
                            Map<String, Object> student = Database.queryOne(con, "SELECT full_name FROM students WHERE id = ?", studentId);
                            List<Map<String, Object>> parents = Database.query(con, "SELECT parent_user_id FROM parent_links WHERE student_id = ?", studentId);
                            for (Map<String, Object> p : parents) {
                                Notifier.notify(((Number) p.get("parent_user_id")).intValue(), "ABSENCE", Map.of(
                                        "student", (String) student.get("full_name"),
                                        "date", dateStr
                                ));
                            }
                        }
                    }
                });
            } catch (RuntimeException e) {
                if (e instanceof ApiError) throw (ApiError) e;
                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                if (e.getCause() instanceof java.sql.SQLException) {
                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                    if (state != null && state.startsWith("23503")) {
                        throw new ApiError(400, "One of the referenced records does not exist");
                    }
                }
                throw e;
            }

            AuditLogger.success(user, "ATTENDANCE_MARKED", "classes", classId, null, Map.of("date", dateStr, "records_count", records.size()));
            Json.send(ex, 200, Map.of("message", "Attendance marked successfully"));
            return;
        }
        throw new ApiError(405, "Method not allowed");
    }
}