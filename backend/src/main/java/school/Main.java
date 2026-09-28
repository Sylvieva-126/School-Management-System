package school;

import com.sun.net.httpserver.HttpServer;
import school.config.Env;
import school.http.Cors;
import school.http.Json;

import java.net.InetSocketAddress;
import java.util.Map;
import java.util.concurrent.Executors;

public class Main {
    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(Env.get("APP_PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        server.createContext("/api/health", ex -> {
            Cors.apply(ex);
            if ("OPTIONS".equals(ex.getRequestMethod())) {
                Json.send(ex, 204, null);
                return;
            }
            Json.send(ex, 200, Map.of("status", "ok"));
        });

        server.setExecutor(Executors.newFixedThreadPool(20));
        server.start();
        System.out.println("School Management System Backend started on port " + port);
    }
}