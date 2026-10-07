package school.handlers;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.QueryParser;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Notifier;
import school.services.Stats;

import java.lang.reflect.Type;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class AttendanceHandler extends SecureHandler {

    private static final Gson gson = new Gson();
    private static final Type RECORD_LIST_TYPE =
            new TypeToken<List<Map<String, Object>>>(){}.getType();

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

    // CLASS TEACHER ONLY: subject teachers may teach in the class but cannot
    // mark its attendance. Admins/super_admins bypass this check.
    private void requireClassTeacher(User user, int classId) {
        if ("teacher".equals(user.role)) {
            Map<String, Object> own = Database.queryOne(
                    "SELECT 1 FROM classes WHERE id = ? AND class_teacher_id = ?",
                    classId, user.id);
            if (own == null) throw new ApiError(403, "Only the class teacher can mark attendance for this class");
        }
    }

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin", "teacher");
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        // ===== GET /api/attendance/class/{classId}/percentage =====
        if (path.startsWith("/api/attendance/class/") && path.endsWith("/percentage") && "GET".equalsIgnoreCase(method)) {
            int classId = pathInt(path.replace("/api/attendance/class/", "").replace("/percentage", ""));
            requireClassTeacher(user, classId);

            List<Map<String, Object>> students = Database.query(
                    "SELECT id, full_name, admission_no FROM students WHERE class_id = ? AND graduated = FALSE ORDER BY full_name ASC",
                    classId);
            List<Map<String, Object>> result = new ArrayList<>();

            for (Map<String, Object> s : students) {
                int studentId = ((Number) s.get("id")).intValue();
                double percentage = Stats.attendancePercentage(studentId);

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("studentId", studentId);
                row.put("studentName", s.get("full_name") != null ? s.get("full_name") : "Unknown");
                row.put("admissionNo", s.get("admission_no") != null ? s.get("admission_no") : "N/A");
                row.put("percentage", percentage);
                result.add(row);
            }
            Json.send(ex, 200, result);
            return;
        }

        // ===== GET /api/attendance?classId=&date=  (stored marks — form prefill) =====
        if ("/api/attendance".equals(path) && "GET".equalsIgnoreCase(method)) {
            Map<String, String> q = QueryParser.parse(ex.getRequestURI().getQuery());
            String classIdStr = q.get("classId");
            String dateStr = q.get("date");
            if (classIdStr == null || classIdStr.isEmpty() || dateStr == null || dateStr.isEmpty()) {
                throw new ApiError(400, "classId and date are required");
            }
            int classId;
            try {
                classId = Integer.parseInt(classIdStr);
            } catch (NumberFormatException e) {
                throw new ApiError(400, "classId must be a number");
            }
            try {
                LocalDate.parse(dateStr);
            } catch (DateTimeParseException e) {
                throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
            }

            requireClassTeacher(user, classId);

            List<Map<String, Object>> records = Database.query(
                    "SELECT student_id, status FROM attendance WHERE class_id = ? AND date = ?::date",
                    classId, dateStr);
            Json.send(ex, 200, records);
            return;
        }

        // ===== POST /api/attendance =====
        if ("/api/attendance".equals(path) && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            int classId = asInt(body.get("classId"));
            String dateStr = (String) body.get("date");

            if (dateStr == null || dateStr.trim().isEmpty()) {
                throw new ApiError(400, "Date is required");
            }
            try {
                LocalDate.parse(dateStr);
            } catch (DateTimeParseException e) {
                throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
            }

            List<Map<String, Object>> records = new ArrayList<>();
            Object rawRecords = body.get("records");

            if (rawRecords instanceof List) {
                for (Object item : (List<?>) rawRecords) {
                    if (item instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> record = (Map<String, Object>) item;
                        records.add(record);
                    }
                }
            }

            if (records.isEmpty()) {
                throw new ApiError(400, "records array is required and must not be empty");
            }

            requireClassTeacher(user, classId);

            Map<String, Object> activeTerm = Database.queryOne("SELECT closed FROM terms WHERE active = TRUE");
            if (activeTerm == null) throw new ApiError(400, "No active term found");
            if (Boolean.TRUE.equals(activeTerm.get("closed"))) {
                throw new ApiError(400, "This term is closed.");
            }

            // Class name for the parent notification
            Map<String, Object> classRow = Database.queryOne("SELECT name FROM classes WHERE id = ?", classId);
            String className = classRow != null && classRow.get("name") != null
                    ? classRow.get("name").toString() : "class";

            try {
                Database.transaction(con -> {
                    for (Map<String, Object> record : records) {
                        int studentId = asInt(record.get("studentId"));
                        String status = record.get("status") != null
                                ? record.get("status").toString().trim().toLowerCase()
                                : "";

                        if (!"present".equals(status) && !"absent".equals(status) && !"late".equals(status)) {
                            throw new ApiError(400, "Status must be 'present' or 'absent' or 'late'. Got: " + status);
                        }

                        Map<String, Object> studentRow = Database.queryOne(con,
                                "SELECT full_name FROM students WHERE id = ?", studentId);
                        if (studentRow == null) {
                            throw new ApiError(400, "Student with id " + studentId + " does not exist");
                        }

                        Database.update(con,
                                "INSERT INTO attendance (student_id, class_id, date, status, marked_by) " +
                                        "VALUES (?, ?, ?::date, ?, ?) " +
                                        "ON CONFLICT (student_id, date) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by",
                                studentId, classId, dateStr, status, user.id
                        );

                        if ("absent".equals(status)) {
                            String studentName = studentRow.get("full_name") != null
                                    ? studentRow.get("full_name").toString() : "Unknown";
                            List<Map<String, Object>> parents = Database.query(con,
                                    "SELECT parent_user_id FROM parent_links WHERE student_id = ?", studentId);
                            for (Map<String, Object> p : parents) {
                                int parentId = ((Number) p.get("parent_user_id")).intValue();
                                Notifier.notify(parentId, "ABSENCE",
                                        Map.of("student", studentName, "date", dateStr, "class", className));
                            }
                        }
                    }
                });
            } catch (ApiError e) {
                throw e;
            } catch (RuntimeException e) {
                if (e.getCause() instanceof ApiError) {
                    throw (ApiError) e.getCause();
                }
                if (e.getCause() instanceof java.sql.SQLException) {
                    java.sql.SQLException sqle = (java.sql.SQLException) e.getCause();
                    if ("23503".equals(sqle.getSQLState())) {
                        throw new ApiError(400, "One of the students does not exist");
                    }
                }
                throw e;
            }

            AuditLogger.success(user, "ATTENDANCE_MARKED", "classes", classId, null,
                    Map.of("date", dateStr, "records_count", records.size()));
            Json.send(ex, 200, Map.of("message", "Attendance marked successfully"));
            return;
        }

        throw new ApiError(405, "Method not allowed");
    }
}