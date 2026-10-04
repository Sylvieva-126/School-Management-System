// src/main/java/school/Main.java
package school;

import com.sun.net.httpserver.HttpServer;
import school.auth.ActivateHandler;
import school.auth.ChangePasswordHandler;
import school.auth.ForgotPasswordHandler;
import school.auth.LoginHandler;
import school.config.Env;
import school.handlers.*;
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
        server.createContext("/api/reset-password", new ActivateHandler());

        // Authenticated Routes
        server.createContext("/api/change-password", new ChangePasswordHandler());
        server.createContext("/api/notifications", new NotificationsHandler());

        // Admin Management (Super Admin only)
        server.createContext("/api/admins", new AdminManagementHandler());

        // Admin & Super Admin Routes
        server.createContext("/api/teachers", new TeachersHandler());
        server.createContext("/api/students", new StudentsHandler());
        server.createContext("/api/classes", new ClassesHandler());
        server.createContext("/api/subjects", new SubjectsHandler());
        server.createContext("/api/assignments", new AssignmentsHandler());
        server.createContext("/api/sessions", new SessionsHandler());
        server.createContext("/api/terms", new SessionsHandler());

        // Phase 4B Routes
        server.createContext("/api/fees", new FeesHandler());
        server.createContext("/api/timetable", new TimetableHandler());
        server.createContext("/api/exams", new ExamsHandler());
        server.createContext("/api/grading-scale", new GradingScaleHandler());
        server.createContext("/api/dashboard", new DashboardHandler());

        // Phase 5 Routes
        server.createContext("/api/attendance", new AttendanceHandler());
        server.createContext("/api/scores", new ScoreHandler());
        server.createContext("/api/teacher", new TeacherPortalHandler());
        server.createContext("/api/teacher-attendance", new TeacherAttendanceHandler());
        server.createContext("/api/student", new StudentPortalHandler());
        server.createContext("/api/parent", new ParentPortalHandler());

        // Phase 6 Routes
        server.createContext("/api/results", new ResultHandler());

        // Phase 7 Routes
        server.createContext("/api/broadcast", new BroadcastHandler());
        server.createContext("/api/deliveries", new DeliveryLogHandler());

        // Activity Logs (Super Admin only)
        server.createContext("/api/audit-logs", new AuditLogHandler());

        // Report Cards (teacher upload, admin publish, student/parent download)
        server.createContext("/api/report-cards", new ReportCardUploadHandler());

        server.setExecutor(Executors.newFixedThreadPool(20));
        server.start();
        System.out.println("School Management System Backend started on port " + port);
    }
}