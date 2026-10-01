// backend/src/main/java/school/handlers/ResultHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;
import school.services.Notifier;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ResultHandler extends SecureHandler {

    private void verifyExists(String table, int id, String entityName) {
        Map<String, Object> row = Database.queryOne("SELECT 1 FROM " + table + " WHERE id = ?", id);
        if (row == null) {
            throw new ApiError(400, entityName + " with id " + id + " does not exist");
        }
    }

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if (path.startsWith("/api/results/compute/") && "POST".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin");
            int examId = pathInt(path.replace("/api/results/compute/", ""));
            verifyExists("exams", examId, "Exam");

            Map<String, Object> exam = Database.queryOne("SELECT published FROM exams WHERE id = ?", examId);
            if (Boolean.TRUE.equals(exam.get("published"))) {
                throw new ApiError(400, "Cannot compute results for a published exam. Unlock it first.");
            }

            List<Map<String, Object>> scale = Database.query("SELECT * FROM grading_scale ORDER BY min_score DESC");

            try {
                Database.transaction(con -> {
                    // 1. Calculate total, average, and position
                    String calcSql =
                            "SELECT student_id, " +
                                    "SUM(score) as total, " +
                                    "ROUND(AVG(score), 1) as average, " +
                                    "RANK() OVER (ORDER BY SUM(score) DESC) as position " +
                                    "FROM scores WHERE exam_id = ? GROUP BY student_id";

                    List<Map<String, Object>> calculations = Database.query(con, calcSql, examId);

                    for (Map<String, Object> calc : calculations) {
                        int studentId = ((Number) calc.get("student_id")).intValue();
                        BigDecimal total = new BigDecimal(calc.get("total").toString());
                        BigDecimal average = new BigDecimal(calc.get("average").toString());
                        int position = ((Number) calc.get("position")).intValue();

                        // 2. Determine grade
                        String grade = null;
                        for (Map<String, Object> s : scale) {
                            BigDecimal minScore = new BigDecimal(s.get("min_score").toString());
                            if (average.compareTo(minScore) >= 0) {
                                grade = (String) s.get("grade");
                                break;
                            }
                        }

                        // 3. Upsert into results
                        Database.update(con,
                                "INSERT INTO results (exam_id, student_id, total, average, grade, position) VALUES (?, ?, ?, ?, ?, ?) " +
                                        "ON CONFLICT (exam_id, student_id) DO UPDATE SET total = EXCLUDED.total, average = EXCLUDED.average, grade = EXCLUDED.grade, position = EXCLUDED.position",
                                examId, studentId, total, average, grade, position
                        );
                    }
                });
            } catch (RuntimeException e) {
                if (e instanceof ApiError) throw (ApiError) e;
                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                throw e;
            }

            AuditLogger.success(user, "RESULTS_COMPUTED", "exams", examId, null, null);
            Json.send(ex, 200, Map.of("message", "Results computed successfully"));
            return;
        }

        if (path.startsWith("/api/results/publish/") && "POST".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin");
            int examId = pathInt(path.replace("/api/results/publish/", ""));
            verifyExists("exams", examId, "Exam");

            Map<String, Object> examInfo = Database.queryOne(
                    "SELECT e.name as exam_name, t.name as term_name FROM exams e JOIN terms t ON e.term_id = t.id WHERE e.id = ?", examId
            );

            final List<Map<String, Object>> notificationsToSend = new ArrayList<>();

            try {
                Database.transaction(con -> {
                    Database.update(con, "UPDATE exams SET published = TRUE WHERE id = ?", examId);

                    // Gather notification data INSIDE transaction, but do not send yet
                    List<Map<String, Object>> students = Database.query(con,
                            "SELECT r.student_id, s.full_name FROM results r JOIN students s ON r.student_id = s.id WHERE r.exam_id = ?", examId
                    );

                    for (Map<String, Object> s : students) {
                        int studentId = ((Number) s.get("student_id")).intValue();
                        String studentName = (String) s.get("full_name");
                        List<Map<String, Object>> parents = Database.query(con, "SELECT parent_user_id FROM parent_links WHERE student_id = ?", studentId);

                        for (Map<String, Object> p : parents) {
                            notificationsToSend.add(Map.of(
                                    "parentId", p.get("parent_user_id"),
                                    "studentName", studentName
                            ));
                        }
                    }
                });
            } catch (RuntimeException e) {
                if (e instanceof ApiError) throw (ApiError) e;
                if (e.getCause() instanceof ApiError) throw (ApiError) e.getCause();
                throw e;
            }

            // Send notifications AFTER transaction commits
            String termName = (String) examInfo.get("term_name");
            for (Map<String, Object> n : notificationsToSend) {
                int parentId = ((Number) n.get("parentId")).intValue();
                String studentName = (String) n.get("studentName");
                Notifier.notify(parentId, "RESULTS_OUT", Map.of(
                        "student", studentName,
                        "term_name", termName
                ));
            }

            AuditLogger.success(user, "RESULTS_PUBLISHED", "exams", examId, null, null);
            Json.send(ex, 200, Map.of("message", "Results published successfully", "count", notificationsToSend.size()));
            return;
        }

        if (path.startsWith("/api/results/unlock/") && "POST".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin");
            int examId = pathInt(path.replace("/api/results/unlock/", ""));
            verifyExists("exams", examId, "Exam");

            Database.update("UPDATE exams SET published = FALSE WHERE id = ?", examId);
            AuditLogger.success(user, "RESULTS_UNLOCKED", "exams", examId, null, null);
            Json.send(ex, 200, Map.of("message", "Results unlocked successfully"));
            return;
        }

        if (path.startsWith("/api/results/exam/") && "GET".equalsIgnoreCase(method)) {
            requireRole(user, "super_admin", "admin", "teacher");
            int examId = pathInt(path.replace("/api/results/exam/", ""));
            verifyExists("exams", examId, "Exam");

            List<Map<String, Object>> results = Database.query(
                    "SELECT r.student_id, s.full_name, r.total, r.average, r.grade, r.position " +
                            "FROM results r JOIN students s ON r.student_id = s.id " +
                            "WHERE r.exam_id = ? ORDER BY r.position ASC, s.full_name ASC",
                    examId
            );
            Json.send(ex, 200, results);
            return;
        }

        throw new ApiError(404, "Not found");
    }
}