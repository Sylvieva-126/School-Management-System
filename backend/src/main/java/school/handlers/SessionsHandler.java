// src/main/java/school/handlers/SessionsHandler.java
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
            Map<String, Object> session = Database.queryOne("SELECT id FROM academic_sessions WHERE id = ?", id);
            if (session == null) throw new ApiError(404, "Session not found");

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

//        if ("/api/terms".equals(path) && "POST".equalsIgnoreCase(method)) {
//            Map<String, Object> body = Json.parseBody(ex);
//            String name = (String) body.get("name");
//            Integer sessionId = body.get("sessionId") != null ? ((Number) body.get("sessionId")).intValue() : null;
//            if (name == null || sessionId == null) throw new ApiError(400, "Term name and session ID are required");
//
//            Database.update("INSERT INTO terms (name, session_id) VALUES (?, ?)", name, sessionId);
//            Json.send(ex, 201, Map.of("message", "Term created"));
//            return;
//        }
        if ("/api/terms".equals(path) && "POST".equalsIgnoreCase(method)) {
            Map<String, Object> body = Json.parseBody(ex);
            String name = (String) body.get("name");
            Integer sessionId = body.get("sessionId") != null ? ((Number) body.get("sessionId")).intValue() : null;
            if (name == null || sessionId == null) throw new ApiError(400, "Term name and session ID are required");

            // ENFORCE: hard cap — a session has exactly 3 terms, period
            long count = ((Number) Database.queryOne(
                    "SELECT COUNT(*) AS c FROM terms WHERE session_id = ?", sessionId).get("c")).longValue();
            if (count >= 3) {
                throw new ApiError(400, "This session already has 3 terms. Create a new session for the next academic year.");
            }

            // ENFORCE: no duplicate term names within the same session
            Map<String, Object> existing = Database.queryOne(
                    "SELECT id FROM terms WHERE session_id = ? AND LOWER(name) = LOWER(?)",
                    sessionId, name.trim());
            if (existing != null) {
                throw new ApiError(409, "This term already exists in this session");
            }

            Database.update("INSERT INTO terms (name, session_id) VALUES (?, ?)", name.trim(), sessionId);
            Json.send(ex, 201, Map.of("message", "Term created"));
            return;
        }



        if (path.startsWith("/api/terms/activate/") && "POST".equalsIgnoreCase(method)) {
            int id = pathInt(path.substring("/api/terms/activate/".length()));
            Map<String, Object> term = Database.queryOne("SELECT closed FROM terms WHERE id = ?", id);
            if (term == null) throw new ApiError(404, "Term not found");
            if (Boolean.TRUE.equals(term.get("closed"))) {
                throw new ApiError(400, "Term is closed. Reopen it first.");
            }
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
            Map<String, Object> term = Database.queryOne("SELECT closed FROM terms WHERE id = ?", id);
            if (term == null) throw new ApiError(404, "Term not found");
            if (Boolean.TRUE.equals(term.get("closed"))) throw new ApiError(400, "Term is already closed");

            // FIX: closing also deactivates — no more "closed but still active"
            Database.update("UPDATE terms SET closed = TRUE, active = FALSE WHERE id = ?", id);
            AuditLogger.success(user, "TERM_CLOSED", "terms", id, null, Map.of("closed", true, "active", false));
            Json.send(ex, 200, Map.of("message", "Term closed"));
            return;
        }

        if (path.startsWith("/api/terms/reopen/") && "POST".equalsIgnoreCase(method)) {
            int id = pathInt(path.substring("/api/terms/reopen/".length()));
            Map<String, Object> term = Database.queryOne("SELECT closed FROM terms WHERE id = ?", id);
            if (term == null) throw new ApiError(404, "Term not found");
            if (!Boolean.TRUE.equals(term.get("closed"))) throw new ApiError(400, "Term is not closed");

            // FIX: reopening makes this the single active term
            Database.transaction(con -> {
                Database.update(con, "UPDATE terms SET active = FALSE");
                Database.update(con, "UPDATE terms SET closed = FALSE, active = TRUE WHERE id = ?", id);
            });
            AuditLogger.success(user, "TERM_REOPENED", "terms", id, null, Map.of("closed", false, "active", true));
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