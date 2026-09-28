package school.http;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RateLimiter {
    private static final Map<String, Attempt> attempts = new ConcurrentHashMap<>();
    private static final long LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes
    private static final long PURGE_TIME_MS = 60 * 60 * 1000; // 1 hour

    private static class Attempt {
        int count;
        long firstFailureTime;
        long lockUntil;

        Attempt(long now) {
            this.count = 1;
            this.firstFailureTime = now;
            this.lockUntil = 0;
        }
    }

    public static synchronized boolean isLocked(String ip) {
        Attempt attempt = attempts.get(ip);
        if (attempt == null) return false;
        if (attempt.lockUntil > System.currentTimeMillis()) {
            return true;
        }
        return false;
    }

    public static synchronized void recordFailure(String ip) {
        long now = System.currentTimeMillis();

        // Housekeeping: purge entries older than 1 hour
        attempts.entrySet().removeIf(entry -> (now - entry.getValue().firstFailureTime) > PURGE_TIME_MS);

        Attempt attempt = attempts.get(ip);
        if (attempt == null) {
            attempts.put(ip, new Attempt(now));
        } else {
            attempt.count++;
            if (attempt.count >= 5) {
                attempt.lockUntil = now + LOCK_TIME_MS;
            }
        }
    }

    public static synchronized void reset(String ip) {
        attempts.remove(ip);
    }
}