//// backend/src/main/java/school/handlers/TimetableHandler.java
//package school.handlers;
//
//import com.sun.net.httpserver.HttpExchange;
//import school.auth.User;
//import school.config.Database;
//import school.http.ApiError;
//import school.http.Json;
//import school.http.SecureHandler;
//import school.services.AuditLogger;
//
//import java.util.List;
//import java.util.Map;
//
//public class TimetableHandler extends SecureHandler {
//
//    private static int asInt(Object value) {
//        if (value == null) throw new ApiError(400, "Missing required number field");
//        if (value instanceof Number) return ((Number) value).intValue();
//        if (value instanceof String) {
//            try {
//                return Integer.parseInt(((String) value).trim());
//            } catch (NumberFormatException e) {
//                throw new ApiError(400, "Expected a number");
//            }
//        }
//        throw new ApiError(400, "Expected a number");
//    }
//
//    private void verifyExists(String table, int id, String entityName) {
//        Map<String, Object> row = Database.queryOne("SELECT 1 FROM " + table + " WHERE id = ?", id);
//        if (row == null) {
//            throw new ApiError(400, entityName + " with id " + id + " does not exist");
//        }
//    }
//
//    @Override
//    protected void handleSecure(HttpExchange ex, User user) throws Exception {
//        requireRole(user, "super_admin", "admin");
//        String method = ex.getRequestMethod();
//
//        if ("GET".equalsIgnoreCase(method)) {
//            String query = ex.getRequestURI().getQuery();
//            Integer classId = null;
//            if (query != null && query.startsWith("classId=")) {
//                try { classId = Integer.parseInt(query.split("=")[1]); } catch (Exception ignored) {}
//            }
//
//            String sql = "SELECT t.*, c.name as class_name, u.full_name as teacher_name, s.name as subject_name " +
//                    "FROM timetable t JOIN classes c ON t.class_id = c.id " +
//                    "JOIN users u ON t.teacher_id = u.id JOIN subjects s ON t.subject_id = s.id ";
//
//            List<Map<String, Object>> timetable;
//            if (classId != null) {
//                sql += "WHERE t.class_id = ? ORDER BY t.day_of_week, t.start_time";
//                timetable = Database.query(sql, classId);
//            } else {
//                sql += "ORDER BY t.day_of_week, t.start_time";
//                timetable = Database.query(sql);
//            }
//
//            Json.send(ex, 200, timetable);
//            return;
//        }
//
//        if ("POST".equalsIgnoreCase(method)) {
//            Map<String, Object> body = Json.parseBody(ex);
//
//            int classId = asInt(body.get("classId"));
//            int teacherId = asInt(body.get("teacherId"));
//            int subjectId = asInt(body.get("subjectId"));
//
//            String dayOfWeek = (String) body.get("dayOfWeek");
//            String startTime = (String) body.get("startTime");
//            String endTime = (String) body.get("endTime");
//
//            if (dayOfWeek == null || startTime == null || endTime == null) {
//                throw new ApiError(400, "All fields are required");
//            }
//
//            verifyExists("classes", classId, "Class");
//            verifyExists("users", teacherId, "Teacher");
//            verifyExists("subjects", subjectId, "Subject");
//
//            // R9: Clash check
//            String clashSql = "SELECT 1 FROM timetable WHERE day_of_week = ? " +
//                    "AND (start_time, end_time) OVERLAPS (?::time, ?::time) " +
//                    "AND (class_id = ? OR teacher_id = ?)";
//
//            Map<String, Object> clash = Database.queryOne(clashSql, dayOfWeek, startTime, endTime, classId, teacherId);
//            if (clash != null) {
//                throw new ApiError(409, "Clash: this class or teacher is already booked at that time.");
//            }
//
//            try {
//                long id = Database.insertReturningId(
//                        "INSERT INTO timetable (class_id, teacher_id, subject_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?::time, ?::time)",
//                        classId, teacherId, subjectId, dayOfWeek, startTime, endTime
//                );
//                AuditLogger.success(user, "TIMETABLE_CREATED", "timetable", (int) id, null, body);
//            } catch (RuntimeException e) {
//                if (e.getCause() instanceof java.sql.SQLException) {
//                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
//                    if (state != null && state.startsWith("23503")) {
//                        throw new ApiError(400, "One of the referenced records does not exist");
//                    }
//                }
//                throw e;
//            }
//
//            Json.send(ex, 201, Map.of("message", "Timetable entry created"));
//            return;
//        }
//        throw new ApiError(405, "Method not allowed");
//    }
//}

package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;

import java.util.List;
import java.util.Map;

public class TimetableHandler extends SecureHandler {

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
            String query = ex.getRequestURI().getQuery();
            Integer classId = null;
            if (query != null && query.startsWith("classId=")) {
                try { classId = Integer.parseInt(query.split("=")[1]); } catch (Exception ignored) {}
            }

            String sql = "SELECT t.*, c.name as class_name, u.full_name as teacher_name, s.name as subject_name " +
                    "FROM timetable t JOIN classes c ON t.class_id = c.id " +
                    "JOIN users u ON t.teacher_id = u.id JOIN subjects s ON t.subject_id = s.id ";

            List<Map<String, Object>> timetable;
            if (classId != null) {
                sql += "WHERE t.class_id = ? ORDER BY t.day_of_week, t.start_time";
                timetable = Database.query(sql, classId);
            } else {
                sql += "ORDER BY t.day_of_week, t.start_time";
                timetable = Database.query(sql);
            }

            Json.send(ex, 200, timetable);
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);

            int classId = asInt(body.get("classId"));
            int teacherId = asInt(body.get("teacherId"));
            int subjectId = asInt(body.get("subjectId"));

            String dayOfWeek = (String) body.get("dayOfWeek");
            String startTime = (String) body.get("startTime");
            String endTime = (String) body.get("endTime");

            if (dayOfWeek == null || startTime == null || endTime == null) {
                throw new ApiError(400, "All fields are required");
            }

            verifyExists("classes", classId, "Class");
            verifyExists("users", teacherId, "Teacher");
            verifyExists("subjects", subjectId, "Subject");

            // A teacher can only be timetabled for subjects they are assigned to teach
            Map<String, Object> owns = Database.queryOne(
                    "SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND subject_id = ?",
                    teacherId, classId, subjectId);
            if (owns == null) {
                throw new ApiError(400, "This teacher is not assigned to teach that subject in that class");
            }

            // Clash check: same class or same teacher, overlapping time, same day
            String clashSql = "SELECT 1 FROM timetable WHERE day_of_week = ? " +
                    "AND (start_time, end_time) OVERLAPS (?::time, ?::time) " +
                    "AND (class_id = ? OR teacher_id = ?)";

            Map<String, Object> clash = Database.queryOne(clashSql, dayOfWeek, startTime, endTime, classId, teacherId);
            if (clash != null) {
                throw new ApiError(409, "Clash: this class or teacher is already booked at that time.");
            }

            try {
                long id = Database.insertReturningId(
                        "INSERT INTO timetable (class_id, teacher_id, subject_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?::time, ?::time)",
                        classId, teacherId, subjectId, dayOfWeek, startTime, endTime
                );
                AuditLogger.success(user, "TIMETABLE_CREATED", "timetable", (int) id, null, body);
            } catch (RuntimeException e) {
                if (e.getCause() instanceof java.sql.SQLException) {
                    String state = ((java.sql.SQLException) e.getCause()).getSQLState();
                    if (state != null && state.startsWith("23503")) {
                        throw new ApiError(400, "One of the referenced records does not exist");
                    }
                }
                throw e;
            }

            Json.send(ex, 201, Map.of("message", "Timetable entry created"));
            return;
        }
        throw new ApiError(405, "Method not allowed");
    }
}