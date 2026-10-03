// backend/src/main/java/school/handlers/ExamsHandler.java
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

public class ExamsHandler extends SecureHandler {

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

    private static double asDouble(Object value) {
        if (value == null) throw new ApiError(400, "Missing required number field");
        if (value instanceof Number) return ((Number) value).doubleValue();
        if (value instanceof String) {
            try {
                return Double.parseDouble(((String) value).trim());
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
            List<Map<String, Object>> exams = Database.query(
                    "SELECT e.*, c.name as class_name, s.name as subject_name, t.name as term_name " +
                            "FROM exams e JOIN classes c ON e.class_id = c.id " +
                            "JOIN subjects s ON e.subject_id = s.id " +
                            "JOIN terms t ON e.term_id = t.id " +
                            "ORDER BY e.id DESC"
            );
            Json.send(ex, 200, exams);
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            String name = (String) body.get("name");

            if (name == null || name.trim().isEmpty()) {
                throw new ApiError(400, "Name is required");
            }

            int termId = asInt(body.get("termId"));
            int classId = asInt(body.get("classId"));
            int subjectId = asInt(body.get("subjectId"));
            double maxScore = body.get("maxScore") != null ? asDouble(body.get("maxScore")) : 100.0;

            verifyExists("terms", termId, "Term");
            verifyExists("classes", classId, "Class");
            verifyExists("subjects", subjectId, "Subject");

            Map<String, Object> term = Database.queryOne("SELECT closed FROM terms WHERE id = ?", termId);
            if (Boolean.TRUE.equals(term.get("closed"))) {
                throw new ApiError(400, "This term is closed.");
            }

            try {
                long id = Database.insertReturningId(
                        "INSERT INTO exams (name, term_id, class_id, subject_id, max_score, created_by) VALUES (?, ?, ?, ?, ?, ?)",
                        name, termId, classId, subjectId, maxScore, user.id
                );
                AuditLogger.success(user, "EXAM_CREATED", "exams", (int) id, null, Map.of("name", name));
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

            Json.send(ex, 201, Map.of("message", "Exam created successfully"));
            return;
        }
        throw new ApiError(405, "Method not allowed");
    }
}