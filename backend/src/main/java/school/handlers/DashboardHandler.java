////src/main/java/school/handlers/DashboardHandler.java
//package school.handlers;
//
//import com.sun.net.httpserver.HttpExchange;
//import school.auth.User;
//import school.config.Database;
//import school.http.ApiError;
//import school.http.Json;
//import school.http.SecureHandler;
//
//import java.util.Map;
//
//public class DashboardHandler extends SecureHandler {
//    @Override
//    protected void handleSecure(HttpExchange ex, User user) throws Exception {
//        requireRole(user, "super_admin", "admin");
//        requireMethod(ex, "GET");
//
//        long students = ((Number) Database.queryOne("SELECT COUNT(*) as c FROM students WHERE graduated = FALSE").get("c")).longValue();
//        long teachers = ((Number) Database.queryOne("SELECT COUNT(*) as c FROM users WHERE role = 'teacher' AND active = TRUE").get("c")).longValue();
//        long classes = ((Number) Database.queryOne("SELECT COUNT(*) as c FROM classes").get("c")).longValue();
//
//        Map<String, Object> financials = Database.queryOne(
//                "SELECT " +
//                        "COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON p.invoice_id = i.id JOIN terms t ON i.term_id = t.id WHERE t.active = TRUE), 0) as total_payments, " +
//                        "COALESCE((SELECT SUM(i.balance) FROM invoices i JOIN terms t ON i.term_id = t.id WHERE t.active = TRUE), 0) as total_balances"
//        );
//
//        Json.send(ex, 200, Map.of(
//                "students", students,
//                "teachers", teachers,
//                "classes", classes,
//                "activeTermPayments", financials.get("total_payments"),
//                "activeTermBalances", financials.get("total_balances")
//        ));
//    }
//}

package school.handlers;

import com.sun.net.httpserver.HttpExchange;
import school.auth.User;
import school.config.Database;
import school.http.ApiError;
import school.http.Json;
import school.http.SecureHandler;

import java.util.Map;

public class DashboardHandler extends SecureHandler {
    @Override
    protected void handleSecure(HttpExchange ex, User user) throws Exception {
        requireRole(user, "super_admin", "admin");
        requireMethod(ex, "GET");

        long students = ((Number) Database.queryOne("SELECT COUNT(*) as c FROM students WHERE graduated = FALSE").get("c")).longValue();
        long teachers = ((Number) Database.queryOne("SELECT COUNT(*) as c FROM users WHERE role = 'teacher' AND active = TRUE").get("c")).longValue();
        long classes = ((Number) Database.queryOne("SELECT COUNT(*) as c FROM classes").get("c")).longValue();

        Map<String, Object> financials = Database.queryOne(
                "SELECT " +
                        "COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON p.invoice_id = i.id JOIN terms t ON i.term_id = t.id WHERE t.active = TRUE), 0) as total_payments, " +
                        "COALESCE((SELECT SUM(i.balance) FROM invoices i JOIN terms t ON i.term_id = t.id WHERE t.active = TRUE), 0) as total_balances, " +
                        "COALESCE((SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE AND status = 'absent'), 0) as students_absent_today, " +
                        "COALESCE((SELECT COUNT(*) FROM teacher_attendance WHERE date = CURRENT_DATE AND status = 'present'), 0) as teachers_present_today, " +
                        "COALESCE((SELECT COUNT(*) FROM report_card_uploads WHERE published = FALSE), 0) as pending_report_cards"
        );

        Json.send(ex, 200, Map.of(
                "students", students,
                "teachers", teachers,
                "classes", classes,
                "activeTermPayments", financials.get("total_payments"),
                "activeTermBalances", financials.get("total_balances"),
                "studentsAbsentToday", financials.get("students_absent_today"),
                "teachersPresentToday", financials.get("teachers_present_today"),
                "pendingReportCards", financials.get("pending_report_cards")
        ));
    }
}