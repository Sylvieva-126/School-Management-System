package school.services;

import java.util.List;
import java.util.Map;

// Minimal stub for Phase 3. Full implementation in Phase 7.
public class Notifier {
    public static void notify(int userId, String event, Map<String, String> data) {
        System.out.println("[MOCK EMAIL/SMS] Event: " + event + " to User ID: " + userId + " Data: " + data);
    }

    public static void notify(int userId, String event, Map<String, String> data, List<String> channelOverride) {
        System.out.println("[MOCK EMAIL/SMS] Event: " + event + " to User ID: " + userId + " Channels: " + channelOverride);
    }
}