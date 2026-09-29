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

public class SessionsHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();

        if (path.startsWith("/api/sessions")) {
            handleSessions(ex, user, path, method);
        } else if (path.startsWith("/api/terms")) {
            handleTerms(ex, user, path, method);
        } else {
            throw new ApiError(404, "Not found");
        }
    }

    private void handleSessions(HttpExchange ex, User user, String path, String method) {
        if ("/api/sessions".equals(path) && "GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> sessions = Database.query("SELECT * FROM academic_sessions ORDER BY id DESC");
            Json.send(ex, 200, sessions);
            return;
        }

        if ("/api/sessions".equals(path) && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            String name = (String) body.get("name");
            if (name == null || name.trim().isEmpty()) throw new ApiError(400, "Session name is required");

            Database.update("INSERT INTO academic_sessions (name) VALUES (?)", name);
            Json.send(ex, 201, Map.of("message", "Session created"));
            return;
        }

        if (path.startsWith("/api/sessions/activate/") && "POST".equalsIgnoreCase(method)) {
            int id = pathInt(path.substring("/api/sessions/activate/".length()));
            Database.transaction(con -> {
                Database.update(con, "UPDATE academic_sessions SET active = FALSE");
                Database.update(con, "UPDATE academic_sessions SET active = TRUE WHERE id = ?", id);
            });
            AuditLogger.success(user, "SESSION_ACTIVATED", "academic_sessions", id, null, Map.of("active", true));
            Json.send(ex, 200, Map.of("message", "Session activated"));
            return;
        }
        throw new ApiError(404, "Not found");
    }

    private void handleTerms(HttpExchange ex, User user, String path, String method) {
        if ("/api/terms".equals(path) && "GET".equalsIgnoreCase(method)) {
            List<Map<String, Object>> terms = Database.query(
                    "SELECT t.*, s.name as session_name FROM terms t JOIN academic_sessions s ON t.session_id = s.id ORDER BY t.id DESC"
            );
            Json.send(ex, 200, terms);
            return;
        }

        if ("/api/terms".equals(path) && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            String name = (String) body.get("name");
            Integer sessionId = body.get("sessionId") != null ? ((Number) body.get("sessionId")).intValue() : null;
            if (name == null || sessionId == null) throw new ApiError(400, "Term name and session ID are required");

            Database.update("INSERT INTO terms (name, session_id) VALUES (?, ?)", name, sessionId);
            Json.send(ex, 201, Map.of("message", "Term created"));
            return;
        }

        if (path.startsWith("/api/terms/activate/") && "POST".equalsIgnoreCase(method)) {
            int id = pathInt(path.substring("/api/terms/activate/".length()));
            Database.transaction(con -> {
                Database.update(con, "UPDATE terms SET active = FALSE");
                Database.update(con, "UPDATE terms SET active = TRUE WHERE id = ?", id);
            });
            AuditLogger.success(user, "TERM_ACTIVATED", "terms", id, null, Map.of("active", true));
            Json.send(ex, 200, Map.of("message", "Term activated"));
            return;
        }

        if (path.startsWith("/api/terms/close/") && "POST".equalsIgnoreCase(method)) {
            int id = pathInt(path.substring("/api/terms/close/".length()));
            Database.update("UPDATE terms SET closed = TRUE WHERE id = ?", id);
            AuditLogger.success(user, "TERM_CLOSED", "terms", id, null, Map.of("closed", true));
            Json.send(ex, 200, Map.of("message", "Term closed"));
            return;
        }

        if (path.startsWith("/api/terms/reopen/") && "POST".equalsIgnoreCase(method)) {
            int id = pathInt(path.substring("/api/terms/reopen/".length()));
            Database.update("UPDATE terms SET closed = FALSE WHERE id = ?", id);
            AuditLogger.success(user, "TERM_REOPENED", "terms", id, null, Map.of("closed", false));
            Json.send(ex, 200, Map.of("message", "Term reopened"));
            return;
        }

        if (path.matches("/api/terms/\\d+/summary") && "GET".equalsIgnoreCase(method)) {
            int id = pathInt(path.replaceAll("[^0-9]", ""));
            Map<String, Object> summary = Database.queryOne(
                    "SELECT " +
                            "(SELECT COUNT(*) FROM students) as total_students, " +
                            "(SELECT COUNT(*) FROM exams WHERE term_id = ?) as total_exams, " +
                            "(SELECT COALESCE(SUM(amount), 0) FROM payments p JOIN invoices i ON p.invoice_id = i.id WHERE i.term_id = ?) as total_payments",
                    id, id
            );
            Json.send(ex, 200, summary);
            return;
        }
        throw new ApiError(404, "Not found");
    }
}