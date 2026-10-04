package school.handlers;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.google.gson.reflect.TypeToken;
import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
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

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin", "teacher");
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        // ===== GET /api/attendance/class/{classId}/percentage =====
        if (path.startsWith("/api/attendance/class/") && path.endsWith("/percentage") && "GET".equalsIgnoreCase(method)) {
            int classId = pathInt(path.replace("/api/attendance/class/", "").replace("/percentage", ""));

            // Ownership check for teachers
            if ("teacher".equals(user.role)) {
                Map<String, Object> assignment = Database.queryOne(
                        "SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?",
                        user.id, classId);
                if (assignment == null) throw new ApiError(403, "This is not your class");
            }

            List<Map<String, Object>> students = Database.query(
                    "SELECT id, full_name, admission_no FROM students WHERE class_id = ? AND graduated = FALSE ORDER BY full_name ASC",
                    classId);
            List<Map<String, Object>> result = new ArrayList<>();

            for (Map<String, Object> s : students) {
                int studentId = ((Number) s.get("id")).intValue();
                double percentage = Stats.attendancePercentage(studentId);

                // NULL-SAFETY: use LinkedHashMap instead of Map.of()
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

        // ===== POST /api/attendance =====
        if ("/api/attendance".equals(path) && "POST".equalsIgnoreCase(method)) {
            System.out.println("=== DEBUG 1: POST /api/attendance reached ===");
            Map<String, Object> body = Json.parseBody(ex);
            int classId = asInt(body.get("classId"));
            String dateStr = (String) body.get("date");

            System.out.println("=== DEBUG 2: classId=" + classId + ", date=" + dateStr);

            if (dateStr == null || dateStr.trim().isEmpty()) {
                throw new ApiError(400, "Date is required");
            }

            try {
                LocalDate.parse(dateStr);
            } catch (DateTimeParseException e) {
                throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
            }

            // SAFE RECORDS PARSING
            List<Map<String, Object>> records = new ArrayList<>();
            Object rawRecords = body.get("records");

            System.out.println("=== DEBUG 3: rawRecords type="
                    + (rawRecords != null ? rawRecords.getClass().getSimpleName() : "NULL"));
            System.out.println("=== DEBUG 3b: rawRecords content=" + rawRecords);

            if (rawRecords instanceof List) {
                for (Object item : (List<?>) rawRecords) {
                    if (item instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> record = (Map<String, Object>) item;
                        records.add(record);
                    }
                }
            }

            System.out.println("=== DEBUG 4: parsed records count=" + records.size());

            if (records.isEmpty()) {
                throw new ApiError(400, "records array is required and must not be empty");
            }

            // Ownership check for teachers
            if ("teacher".equals(user.role)) {
                Map<String, Object> assignment = Database.queryOne(
                        "SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?",
                        user.id, classId);
                if (assignment == null) throw new ApiError(403, "This is not your class");
            }

            // Reject closed terms
            Map<String, Object> activeTerm = Database.queryOne("SELECT closed FROM terms WHERE active = TRUE");
            if (activeTerm == null) throw new ApiError(400, "No active term found");
            if (Boolean.TRUE.equals(activeTerm.get("closed"))) {
                throw new ApiError(400, "This term is closed.");
            }

            System.out.println("=== DEBUG 5: About to enter transaction with " + records.size() + " records");

            try {
                Database.transaction(con -> {
                    for (Map<String, Object> record : records) {
                        int studentId = asInt(record.get("studentId"));
                        String status = record.get("status") != null
                                ? record.get("status").toString().trim().toLowerCase()
                                : "";

                        System.out.println("=== DEBUG 6: Processing student=" + studentId + ", status=" + status);

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
                            System.out.println("=== DEBUG 7: ABSENCE TRIGGERED for student=" + studentId);
                            System.out.println("=== DEBUG 8: Looking up parents for student=" + studentId);
                            String studentName = studentRow.get("full_name") != null
                                    ? studentRow.get("full_name").toString() : "Unknown";
                            List<Map<String, Object>> parents = Database.query(con,
                                    "SELECT parent_user_id FROM parent_links WHERE student_id = ?", studentId);
                            System.out.println("=== DEBUG 9: Parents found=" + parents.size());
                            for (Map<String, Object> p : parents) {
                                int parentId = ((Number) p.get("parent_user_id")).intValue();
                                System.out.println("=== DEBUG 10: Notifying parent=" + parentId);
                                Notifier.notify(parentId, "ABSENCE",
                                        Map.of("student", studentName, "date", dateStr));
                            }
                        }
                    }
                });
            } catch (ApiError e) {
                System.out.println("=== DEBUG CAUGHT ApiError: " + e.getMessage());
                throw e;
            } catch (RuntimeException e) {
                if (e.getCause() instanceof ApiError) {
                    System.out.println("=== DEBUG CAUGHT wrapped ApiError: " + e.getCause().getMessage());
                    throw (ApiError) e.getCause();
                }
                if (e.getCause() instanceof java.sql.SQLException) {
                    java.sql.SQLException sqle = (java.sql.SQLException) e.getCause();
                    if ("23503".equals(sqle.getSQLState())) {
                        throw new ApiError(400, "One of the students does not exist");
                    }
                }
                System.out.println("=== DEBUG CAUGHT RuntimeException: " + e.getMessage());
                throw e;
            }

            System.out.println("=== DEBUG 11: Transaction completed successfully");
            AuditLogger.success(user, "ATTENDANCE_MARKED", "classes", classId, null,
                    Map.of("date", dateStr, "records_count", records.size()));
            Json.send(ex, 200, Map.of("message", "Attendance marked successfully"));
            return;
        }

        throw new ApiError(405, "Method not allowed");
    }
}