package school;

import com.sun.net.httpserver.HttpServer;
import school.auth.ActivateHandler;
import school.auth.ChangePasswordHandler;
import school.auth.ForgotPasswordHandler;
import school.auth.LoginHandler;
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

        // Public Routes
        server.createContext("/api/health", ex -> {
            Cors.apply(ex);
            if ("OPTIONS".equals(ex.getRequestMethod())) {
                Json.send(ex, 204, null);
                return;
            }
            Json.send(ex, 200, Map.of("status", "ok"));
        });

        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/activate", new ActivateHandler());
        server.createContext("/api/forgot-password", new ForgotPasswordHandler());
        // /api/reset-password reuses the activation logic per Master Context
        server.createContext("/api/reset-password", new ActivateHandler());

        // Authenticated Routes
        server.createContext("/api/change-password", new ChangePasswordHandler());

        server.setExecutor(Executors.newFixedThreadPool(20));
        server.start();
        System.out.println("School Management System Backend started on port " + port);
    }
}