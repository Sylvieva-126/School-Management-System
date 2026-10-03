// backend/src/main/java/school/handlers/ExportHandler.java
package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.http.Json;
import school.http.SecureHandler;

import java.util.Map;

// Minimal stub for Phase 8 to ensure Main.java compiles. Full implementation in Phase 10.
public class ExportHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        Json.send(ex, 200, Map.of("message", "ExportHandler stub"));
    }
}