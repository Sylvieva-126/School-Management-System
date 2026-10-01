// backend/src/main/java/school/services/SmsSender.java
package school.services;

import com.google.gson.Gson;
import school.config.Env;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

public class SmsSender {
    private static final Gson gson = new Gson();
    private static final HttpClient client = HttpClient.newHttpClient();

    public static void send(String to, String message) throws Exception {
        String mode = Env.get("SMS_MODE", "mock");

        if (!"live".equals(mode)) {
            System.out.println("[MOCK SMS] To: " + to + " | Msg: " + message);
            return;
        }

        String apiUrl = Env.get("SMS_API_URL");
        String apiKey = Env.get("SMS_API_KEY");
        String senderId = Env.get("SMS_SENDER_ID");

        Map<String, String> payload = Map.of(
                "api_key", apiKey,
                "to", to,
                "from", senderId,
                "sms", message,
                "channel", "dnd"
        );

        String json = gson.toJson(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("SMS API returned status " + response.statusCode() + ": " + response.body());
        }
    }
}