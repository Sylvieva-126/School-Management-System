package school.http;

import com.sun.net.httpserver.*;
import school.auth.Auth;
import school.auth.User;
import java.io.IOException;

public abstract class SecureHandler implements HttpHandler {
    public static final ThreadLocal<String> CURRENT_IP =
            ThreadLocal.withInitial(() -> "unknown");

    @Override
    public final void handle(HttpExchange ex) throws IOException {
        try {
            CURRENT_IP.set(ex.getRemoteAddress().getAddress().getHostAddress());
            Cors.apply(ex);
            if ("OPTIONS".equals(ex.getRequestMethod())) {
                Json.send(ex, 204, null); return;
            }
            User user = Auth.authenticate(ex);
            handleSecure(ex, user);
        } catch (ApiError e) {
            Json.send(ex, e.status, java.util.Map.of("message", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            Json.send(ex, 500, java.util.Map.of("message", "Something went wrong"));
        } finally {
            CURRENT_IP.remove();
        }
    }

    protected abstract void handleSecure(HttpExchange ex, User user) throws Exception;

    protected void requireRole(User u, String... roles) {
        if (u == null) throw new ApiError(401, "Please log in");
        for (String r : roles) if (r.equals(u.role)) return;
        throw new ApiError(403, "You are not allowed to do this");
    }

    protected void requireMethod(HttpExchange ex, String m) {
        if (!ex.getRequestMethod().equalsIgnoreCase(m))
            throw new ApiError(405, "Method not allowed");
    }

    protected String rest(HttpExchange ex) {
        String prefix = ex.getHttpContext().getPath();
        String path = ex.getRequestURI().getPath();
        return path.length() > prefix.length() ? path.substring(prefix.length()) : "/";
    }

    protected int pathInt(String s) {
        try { return Integer.parseInt(s.replace("/","")); }
        catch (NumberFormatException e) { throw new ApiError(400, "Invalid id in URL"); }
    }
}