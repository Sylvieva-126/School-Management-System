package school.http;

import com.sun.net.httpserver.HttpExchange;
import school.config.Env;

public class Cors {
    public static void apply(HttpExchange ex) {
        String origin = Env.get("APP_CORS_ORIGIN", "http://localhost:5173");
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", origin);
        ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    }
}
//