package school.config;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

public class Env {
    private static final Map<String, String> vars = new HashMap<>();

    static {
        try {
            if (Files.exists(Paths.get(".env"))) {
                for (String line : Files.readAllLines(Paths.get(".env"))) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) continue;
                    int idx = line.indexOf('=');
                    if (idx > 0) {
                        vars.put(line.substring(0, idx).trim(), line.substring(idx + 1).trim());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not load .env file");
        }
    }

    public static String get(String key) {
        String val = vars.getOrDefault(key, System.getenv(key));
        if (val == null || val.isEmpty()) {
            throw new RuntimeException("Missing required environment variable: " + key);
        }
        return val;
    }

    public static String get(String key, String fallback) {
        String val = vars.getOrDefault(key, System.getenv(key));
        return (val != null && !val.isEmpty()) ? val : fallback;
    }
}