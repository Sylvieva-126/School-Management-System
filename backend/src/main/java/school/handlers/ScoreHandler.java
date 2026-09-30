package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.AuditLogger;

import java.math.BigDecimal;
import java.util.Map;

public class ScoreHandler extends SecureHandler {

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

    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin", "teacher");
        requireMethod(ex, "POST");

        Map<String, Object> body = Json.parseBody(ex);
        int examId = asInt(body.get("examId"));
        int studentId = asInt(body.get("studentId"));
        double scoreNum = asDouble(body.get("score"));
        BigDecimal score = new BigDecimal(String.valueOf(scoreNum));

        Map<String, Object> exam = Database.queryOne(
                "SELECT e.class_id, e.subject_id, e.max_score, e.published, t.closed " +
                        "FROM exams e JOIN terms t ON e.term_id = t.id WHERE e.id = ?", examId
        );

        if (exam == null) throw new ApiError(404, "Exam not found");

        // R13: Closed term check
        if (Boolean.TRUE.equals(exam.get("closed"))) {
            throw new ApiError(400, "This term is closed.");
        }

        // R6: Published check
        if (Boolean.TRUE.equals(exam.get("published"))) {
            throw new ApiError(403, "Results are locked. Ask an admin to unlock them.");
        }

        int classId = ((Number) exam.get("class_id")).intValue();
        int subjectId = ((Number) exam.get("subject_id")).intValue();
        BigDecimal maxScore = new BigDecimal(exam.get("max_score").toString());

        // R6: Ownership check for teachers
        if ("teacher".equals(user.role)) {
            Map<String, Object> assignment = Database.queryOne(
                    "SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND subject_id = ?",
                    user.id, classId, subjectId
            );
            if (assignment == null) throw new ApiError(403, "This is not your subject/class");
        }

        // R6: Score bounds check
        if (score.compareTo(BigDecimal.ZERO) < 0 || score.compareTo(maxScore) > 0) {
            throw new ApiError(400, "Score must be between 0 and " + maxScore);
        }

        // R6: Student belongs to exam's class check
        Map<String, Object> studentCheck = Database.queryOne("SELECT 1 FROM students WHERE id = ? AND class_id = ?", studentId, classId);
        if (studentCheck == null) {
            throw new ApiError(400, "Student is not in this exam's class.");
        }

        Map<String, Object> existingScore = Database.queryOne("SELECT score FROM scores WHERE exam_id = ? AND student_id = ?", examId, studentId);

        Database.update(
                "INSERT INTO scores (exam_id, student_id, score, entered_by) VALUES (?, ?, ?, ?) " +
                        "ON CONFLICT (exam_id, student_id) DO UPDATE SET score = EXCLUDED.score, entered_by = EXCLUDED.entered_by, updated_at = now()",
                examId, studentId, score, user.id
        );

        if (existingScore == null) {
            AuditLogger.success(user, "SCORE_ENTRY", "scores", null, null, Map.of("exam_id", examId, "student_id", studentId, "score", score));
        } else {
            AuditLogger.success(user, "SCORE_EDIT", "scores", null,
                    Map.of("exam_id", examId, "student_id", studentId, "score", existingScore.get("score")),
                    Map.of("exam_id", examId, "student_id", studentId, "score", score)
            );
        }

        Json.send(ex, 200, Map.of("message", "Score saved successfully"));
    }
}