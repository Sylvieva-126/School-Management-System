// backend/src/main/java/school/handlers/GradingScaleHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;

import java.util.List;
import java.util.Map;

public class GradingScaleHandler extends SecureHandler {

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
        requireRole(user, "super_admin", "admin");
        String method = ex.getRequestMethod();

        if ("GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> scale = Database.query("SELECT * FROM grading_scale ORDER BY min_score DESC");
            Json.send(ex, 200, scale);
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);

            double minScore = asDouble(body.get("minScore"));
            double maxScore = asDouble(body.get("maxScore"));
            String grade = (String) body.get("grade");
            String remark = (String) body.get("remark");

            if (grade == null || grade.trim().isEmpty()) {
                throw new ApiError(400, "Grade is required");
            }

            Database.update(
                    "INSERT INTO grading_scale (min_score, max_score, grade, remark) VALUES (?, ?, ?, ?)",
                    minScore, maxScore, grade, remark
            );
            Json.send(ex, 201, Map.of("message", "Grading scale entry created"));
            return;
        }
        throw new ApiError(405, "Method not allowed");
    }
}