// backend/src/main/java/school/handlers/PromotionHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.config.Env;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;

import java.util.List;
import java.util.Map;

public class PromotionHandler extends SecureHandler {

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
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if ("/api/promotion/run".equals(path) && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            final int fromClassId = asInt(body.get("fromClassId"));
            final int toClassId = asInt(body.get("toClassId"));
            final String mode = (String) body.get("mode");

            if (!"all".equals(mode) && !"passed".equals(mode)) {
                throw new ApiError(400, "Mode must be 'all' or 'passed'");
            }

            verifyExists("classes", fromClassId, "From Class");
            verifyExists("classes", toClassId, "To Class");

            final double passMark = Double.parseDouble(Env.get("PASS_MARK", "40"));
            final int[] counts = {0, 0}; // [promoted, retained]

            try {
                Database.transaction(con -> {
                    List<Map<String, Object>> students = Database.query(con, "SELECT id FROM students WHERE class_id = ? AND graduated = FALSE", fromClassId);

                    for (Map<String, Object> s : students) {
                        int studentId = ((Number) s.get("id")).intValue();
                        boolean promote = false;

                        if ("all".equals(mode)) {
                            promote = true;
                        } else if ("passed".equals(mode)) {
                            // Find latest published exam average for this student in this class
                            Map<String, Object> latestResult = Database.queryOne(con,
                                    "SELECT r.average FROM results r JOIN exams e ON r.exam_id = e.id " +
                                            "WHERE r.student_id = ? AND e.class_id = ? AND e.published = TRUE " +
                                            "ORDER BY e.id DESC LIMIT 1",
                                    studentId, fromClassId
                            );

                            if (latestResult != null && latestResult.get("average") != null) {
                                double average = ((Number) latestResult.get("average")).doubleValue();
                                if (average >= passMark) {
                                    promote = true;
                                }
                            }
                        }

                        if (promote) {
                            Database.update(con, "UPDATE students SET class_id = ? WHERE id = ?", toClassId, studentId);
                            counts[0]++;
                        } else {
                            counts[1]++;
                        }
                    }
                });
            } catch (RuntimeException e) {
                if (e instanceof ApiError) throw (ApiError) e;
                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                throw e;
            }

            AuditLogger.success(user, "STUDENTS_PROMOTED", "classes", fromClassId, null, Map.of(
                    "to_class_id", toClassId,
                    "mode", mode,
                    "promoted_count", counts[0],
                    "retained_count", counts[1]
            ));

            Json.send(ex, 200, Map.of(
                    "message", "Promotion run completed",
                    "promotedCount", counts[0],
                    "retainedCount", counts[1]
            ));
            return;
        }

        if (path.startsWith("/api/promotion/graduate/") && "POST".equalsIgnoreCase(method)) {
            int classId = pathInt(path.replace("/api/promotion/graduate/", ""));
            verifyExists("classes", classId, "Class");

            final int[] count = {0};

            try {
                Database.transaction(con -> {
                    List<Map<String, Object>> students = Database.query(con, "SELECT id, user_id FROM students WHERE class_id = ? AND graduated = FALSE", classId);
                    for (Map<String, Object> s : students) {
                        int studentId = ((Number) s.get("id")).intValue();
                        int userId = ((Number) s.get("user_id")).intValue();

                        Database.update(con, "UPDATE students SET graduated = TRUE WHERE id = ?", studentId);
                        Database.update(con, "UPDATE users SET active = FALSE WHERE id = ?", userId);
                        count[0]++;
                    }
                });
            } catch (RuntimeException e) {
                if (e instanceof ApiError) throw (ApiError) e;
                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                throw e;
            }

            AuditLogger.success(user, "STUDENTS_GRADUATED", "classes", classId, null, Map.of("count", count[0]));
            Json.send(ex, 200, Map.of("message", count[0] + " students graduated successfully"));
            return;
        }

        throw new ApiError(404, "Not found");
    }
}