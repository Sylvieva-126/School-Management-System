//// src/main/java/school/services/Notifier.java
//package school.services;
//
//import school.config.Database;
//
//import java.util.List;
//import java.util.Map;
//
//public class Notifier {
//
//    private static final Map<String, List<String>> CHANNELS = Map.of(
//            "ABSENCE", List.of("sms"),
//            "RESULTS_OUT", List.of("email", "sms"),
//            "PAYMENT_OK", List.of("email"),
//            "FEE_REMINDER", List.of("email", "sms"),
//            "ACCOUNT_CREATED", List.of("email", "sms"),
//            "ANNOUNCEMENT", List.of("email"),
//            "PASSWORD_CHANGED", List.of("email"),
//            "REPORT_CARD_PUBLISHED", List.of("email", "sms"),
//            "PASSWORD_RESET", List.of("email", "sms")
//    );
//
//    private static final Map<String, String> TITLES = Map.of(
//            "ABSENCE", "Student Absence",
//            "RESULTS_OUT", "Exam Results Published",
//            "PAYMENT_OK", "Payment Received",
//            "FEE_REMINDER", "Fee Reminder",
//            "ACCOUNT_CREATED", "Welcome to School",
//            "ANNOUNCEMENT", "School Announcement",
//            "PASSWORD_CHANGED", "Password Changed",
//            "REPORT_CARD_PUBLISHED", "Report Card Available",
//            "PASSWORD_RESET", "Password Reset"
//    );
//
//    private static final Map<String, String> TEMPLATES = Map.of(
//            "ABSENCE", "{student} was marked absent on {date}.",
//            "RESULTS_OUT", "Results for {student} are now available on the portal.",
//            "PAYMENT_OK", "Payment of {amount} received successfully. Thank you.",
//            "FEE_REMINDER", "Reminder: {student} has an outstanding fee balance of {amount}.",
//            "ACCOUNT_CREATED", "Hello {name}, your account has been created. Activate here: {link}",
//            "ANNOUNCEMENT", "{message}",
//            "PASSWORD_CHANGED", "Your account password was changed successfully.",
//            "REPORT_CARD_PUBLISHED", "The report card for {student} is now available on the portal.",
//            "PASSWORD_RESET", "Hello {name}, use this link to reset your password: {link}"
//    );
//
//    public static void notify(int userId, String event, Map<String, String> data) {
//        notify(userId, event, data, CHANNELS.getOrDefault(event, List.of()));
//    }
//
//    public static void notify(int userId, String event, Map<String, String> data, List<String> channelOverride) {
//        String title = TITLES.getOrDefault(event, "Notification");
//        String body = TEMPLATES.getOrDefault(event, "");
//        String link = data.getOrDefault("link", null);
//        String studentName = data.getOrDefault("student", "");
//
//        // Replace placeholders
//        for (Map.Entry<String, String> entry : data.entrySet()) {
//            body = body.replace("{" + entry.getKey() + "}", entry.getValue());
//        }
//
//        // DEDUP: only for per-student events (e.g. ABSENCE) — same user + event + student, per day.
//        // Events without a student name (ANNOUNCEMENT, PASSWORD_RESET, ACCOUNT_CREATED resend)
//        // must never dedup, or repeat sends on the same day get silently swallowed.
//        if (!studentName.isEmpty()) {
//            String searchBody = "%" + studentName + "%";
//            Map<String, Object> existing = Database.queryOne(
//                    "SELECT id FROM notifications WHERE user_id = ? AND type = ? AND DATE(created_at) = CURRENT_DATE AND body LIKE ?",
//                    userId, event, searchBody
//            );
//            if (existing != null) {
//                return; // Dedup triggered, do not send duplicate
//            }
//        }
//
//        // 1. Insert into notifications (in-app)
//        String notifSql = "INSERT INTO notifications (user_id, title, body, type, link) VALUES (?, ?, ?, ?, ?)";
//
//        try {
//            Database.update(notifSql, userId, title, body, event, link);
//        } catch (Exception e) {
//            System.err.println("FAILED TO INSERT NOTIFICATION:");
//            e.printStackTrace();
//        }
//
//        // 2. Queue deliveries (skips channels the user has no address for)
//        if (channelOverride != null && !channelOverride.isEmpty()) {
//            Map<String, Object> user = Database.queryOne("SELECT phone, email FROM users WHERE id = ?", userId);
//            if (user != null) {
//                String phone = (String) user.get("phone");
//                String email = (String) user.get("email");
//
//                for (String channel : channelOverride) {
//                    if ("sms".equals(channel) && phone != null && !phone.isEmpty()) {
//                        DeliveryQueue.submit(userId, channel, event, phone, title, body);
//                    } else if ("email".equals(channel) && email != null && !email.isEmpty()) {
//                        DeliveryQueue.submit(userId, channel, event, email, title, body);
//                    }
//                }
//            }
//        }
//    }
//}

package school.services;

import school.config.Database;

import java.util.List;
import java.util.Map;

public class Notifier {

    private static final Map<String, List<String>> CHANNELS = Map.of(
            "ABSENCE", List.of("sms"),
            "STUDENT_ADMITTED", List.of("email", "sms"),
            "RESULTS_OUT", List.of("email", "sms"),
            "PAYMENT_OK", List.of("email"),
            "FEE_REMINDER", List.of("email", "sms"),
            "ACCOUNT_CREATED", List.of("email", "sms"),
            "ANNOUNCEMENT", List.of("email"),
            "PASSWORD_CHANGED", List.of("email"),
            "REPORT_CARD_PUBLISHED", List.of("email", "sms"),
            "PASSWORD_RESET", List.of("email", "sms")
    );

    private static final Map<String, String> TITLES = Map.of(
            "ABSENCE", "Student Absence",
            "STUDENT_ADMITTED", "Child Admitted",
            "RESULTS_OUT", "Exam Results Published",
            "PAYMENT_OK", "Payment Received",
            "FEE_REMINDER", "Fee Reminder",
            "ACCOUNT_CREATED", "Welcome to School",
            "ANNOUNCEMENT", "School Announcement",
            "PASSWORD_CHANGED", "Password Changed",
            "REPORT_CARD_PUBLISHED", "Report Card Available",
            "PASSWORD_RESET", "Password Reset"
    );

    private static final Map<String, String> TEMPLATES = Map.of(
            "ABSENCE", "{student} was marked absent in {class} on {date}.",
            "STUDENT_ADMITTED", "Your child {student} has been admitted. Admission number: {admissionNo}. Activate your account here: {link}",
            "RESULTS_OUT", "Results for {student} are now available on the portal.",
            "PAYMENT_OK", "Payment of {amount} received successfully. Thank you.",
            "FEE_REMINDER", "Reminder: {student} has an outstanding fee balance of {amount}.",
            "ACCOUNT_CREATED", "Hello {name}, your account has been created. Activate here: {link}",
            "ANNOUNCEMENT", "{message}",
            "PASSWORD_CHANGED", "Your account password was changed successfully.",
            "REPORT_CARD_PUBLISHED", "The report card for {student} is now available on the portal.",
            "PASSWORD_RESET", "Hello {name}, use this link to reset your password: {link}"
    );

    public static void notify(int userId, String event, Map<String, String> data) {
        notify(userId, event, data, CHANNELS.getOrDefault(event, List.of()));
    }

    public static void notify(int userId, String event, Map<String, String> data, List<String> channelOverride) {
        String title = TITLES.getOrDefault(event, "Notification");
        String body = TEMPLATES.getOrDefault(event, "");
        String link = data.getOrDefault("link", null);
        String studentName = data.getOrDefault("student", "");

        for (Map.Entry<String, String> entry : data.entrySet()) {
            body = body.replace("{" + entry.getKey() + "}", entry.getValue());
        }
        // Strip a leftover {link} placeholder when the event carries no link
        if (link == null) {
            body = body.replace("Activate your account here: {link}", "").replace("{link}", "");
            body = body.replaceAll("\\s{2,}", " ").trim();
        }

        // DEDUP: only for per-student events (ABSENCE etc.) — same user + event + student, per day.
        if (!studentName.isEmpty()) {
            String searchBody = "%" + studentName + "%";
            Map<String, Object> existing = Database.queryOne(
                    "SELECT id FROM notifications WHERE user_id = ? AND type = ? AND DATE(created_at) = CURRENT_DATE AND body LIKE ?",
                    userId, event, searchBody
            );
            if (existing != null) {
                return;
            }
        }

        String notifSql = "INSERT INTO notifications (user_id, title, body, type, link) VALUES (?, ?, ?, ?, ?)";

        try {
            Database.update(notifSql, userId, title, body, event, link);
        } catch (Exception e) {
            System.err.println("FAILED TO INSERT NOTIFICATION:");
            e.printStackTrace();
        }

        if (channelOverride != null && !channelOverride.isEmpty()) {
            Map<String, Object> user = Database.queryOne("SELECT phone, email FROM users WHERE id = ?", userId);
            if (user != null) {
                String phone = (String) user.get("phone");
                String email = (String) user.get("email");

                for (String channel : channelOverride) {
                    if ("sms".equals(channel) && phone != null && !phone.isEmpty()) {
                        DeliveryQueue.submit(userId, channel, event, phone, title, body);
                    } else if ("email".equals(channel) && email != null && !email.isEmpty()) {
                        DeliveryQueue.submit(userId, channel, event, email, title, body);
                    }
                }
            }
        }
    }
}