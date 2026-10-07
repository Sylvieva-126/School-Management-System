// src/main/java/school/handlers/ParentPortalHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;
import school.services.Stats;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ParentPortalHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "parent");
        requireMethod(ex, "GET");

        String path = ex.getRequestURI().getPath();

        if ("/api/parent/children".equals(path)) {
            List<Map<String, Object>> children = Database.query(
                    "SELECT s.id, s.full_name, s.admission_no, c.name as class_name, u.full_name as class_teacher_name " +
                            "FROM parent_links pl " +
                            "JOIN students s ON pl.student_id = s.id " +
                            "LEFT JOIN classes c ON s.class_id = c.id " +
                            "LEFT JOIN users u ON c.class_teacher_id = u.id " +
                            "WHERE pl.parent_user_id = ? AND s.graduated = FALSE",
                    user.id
            );

            //  LinkedHashMap allows nulls (Map.of crashes when class/teacher is unassigned)
            List<Map<String, Object>> result = new ArrayList<>();
            for (Map<String, Object> child : children) {
                int studentId = ((Number) child.get("id")).intValue();
                double attendance = Stats.attendancePercentage(studentId);

                Map<String, Object> feeRow = Database.queryOne(
                        "SELECT COALESCE(SUM(i.balance), 0) as total_balance FROM invoices i JOIN terms t ON i.term_id = t.id WHERE i.student_id = ? AND t.active = TRUE",
                        studentId
                );
                BigDecimal balance = new BigDecimal(feeRow.get("total_balance").toString());

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", studentId);
                row.put("full_name", child.get("full_name"));
                row.put("admission_no", child.get("admission_no"));
                row.put("class_name", child.get("class_name"));                  // may be null
                row.put("class_teacher_name", child.get("class_teacher_name"));  // may be null
                row.put("attendance_percentage", attendance);
                row.put("fee_balance", balance);
                result.add(row);
            }
            Json.send(ex, 200, result);
            return;
        }

        if (path.matches("/api/parent/children/\\d+/report-cards")) {
            int studentId = pathInt(path.split("/")[4]);
            verifyOwnership(user.id, studentId);

            List<Map<String, Object>> cards = Database.query(
                    "SELECT r.id, r.file_name, r.file_type, r.uploaded_at, e.name AS exam_name, t.name AS term_name " +
                            "FROM report_card_uploads r " +
                            "JOIN exams e ON r.exam_id = e.id " +
                            "JOIN terms t ON e.term_id = t.id " +
                            "WHERE r.student_id = ? AND r.published = TRUE " +
                            "ORDER BY r.uploaded_at DESC",
                    studentId
            );
            Json.send(ex, 200, cards);
            return;
        }

        if (path.matches("/api/parent/children/\\d+/results")) {
            int studentId = pathInt(path.split("/")[4]);
            verifyOwnership(user.id, studentId);

            List<Map<String, Object>> results = Database.query(
                    "SELECT r.*, e.name as exam_name, s.name as subject_name, t.name as term_name " +
                            "FROM results r " +
                            "JOIN exams e ON r.exam_id = e.id " +
                            "JOIN subjects s ON e.subject_id = s.id " +
                            "JOIN terms t ON e.term_id = t.id " +
                            "WHERE r.student_id = ? AND e.published = TRUE " +
                            "ORDER BY e.id DESC",
                    studentId
            );
            Json.send(ex, 200, results);
            return;
        }

        if (path.matches("/api/parent/children/\\d+/fees")) {
            int studentId = pathInt(path.split("/")[4]);
            verifyOwnership(user.id, studentId);

            List<Map<String, Object>> fees = Database.query(
                    "SELECT i.*, t.name as term_name " +
                            "FROM invoices i " +
                            "JOIN terms t ON i.term_id = t.id " +
                            "WHERE i.student_id = ? " +
                            "ORDER BY i.id DESC",
                    studentId
            );
            Json.send(ex, 200, fees);
            return;
        }

        throw new ApiError(404, "Not found");
    }

    private void verifyOwnership(int parentId, int studentId) {
        Map<String, Object> link = Database.queryOne("SELECT 1 FROM parent_links WHERE parent_user_id = ? AND student_id = ?", parentId, studentId);
        if (link == null) {
            throw new ApiError(403, "You do not have access to this student");
        }
    }
}