// backend/src/main/java/school/services/DeliveryQueue.java
package school.services;

import school.config.Database;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DeliveryQueue {
    private static final ExecutorService executor = Executors.newFixedThreadPool(4);

    public static void submit(int userId, String channel, String event, String recipient, String title, String body) {
        String sql = "INSERT INTO notification_deliveries (user_id, channel, event, recipient, status) VALUES (?, ?, ?, ?, 'queued')";
        System.out.println("DEBUG SQL: " + sql + " | Params: " + userId + ", " + channel + ", " + event + ", " + recipient);

        long generatedId = -1;
        try {
            generatedId = Database.insertReturningId(sql, userId, channel, event, recipient);
        } catch (Exception e) {
            System.err.println("FAILED TO INSERT NOTIFICATION DELIVERY:");
            e.printStackTrace();
            return; // Cannot proceed without the delivery ID
        }

        // LAMBDA-CAPTURE RULE: Ensure all variables used in the lambda are explicitly final
        final long finalDeliveryId = generatedId;
        final String finalChannel = channel;
        final String finalRecipient = recipient;
        final String finalTitle = title;
        final String finalBody = body;

        executor.submit(() -> {
            try {
                if ("sms".equals(finalChannel)) {
                    SmsSender.send(finalRecipient, finalBody);
                } else if ("email".equals(finalChannel)) {
                    EmailSender.send(finalRecipient, finalTitle, finalBody);
                }

                Database.update("UPDATE notification_deliveries SET status = 'sent', attempts = attempts + 1 WHERE id = ?", finalDeliveryId);
            } catch (Exception e) {
                String errorMsg = e.getMessage();
                if (errorMsg != null && errorMsg.length() > 250) {
                    errorMsg = errorMsg.substring(0, 250);
                }
                Database.update("UPDATE notification_deliveries SET status = 'failed', error = ?, attempts = attempts + 1 WHERE id = ?", errorMsg, finalDeliveryId);
            }
        });
    }
}