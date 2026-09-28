package school.http;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.google.gson.reflect.TypeToken;
import com.sun.net.httpserver.HttpExchange;

import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class Json {
    private static final Gson gson = new Gson();

    public static void send(HttpExchange ex, int statusCode, Object data) {
        try {
            String response = data == null ? "" : gson.toJson(data);
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().set("Content-Type", "application/json");
            ex.sendResponseHeaders(statusCode, bytes.length == 0 ? -1 : bytes.length);
            if (bytes.length > 0) {
                try (OutputStream os = ex.getResponseBody()) {
                    os.write(bytes);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static Map<String, Object> parseBody(HttpExchange ex) {
        try (InputStreamReader reader = new InputStreamReader(ex.getRequestBody(), StandardCharsets.UTF_8)) {
            Map<String, Object> map = gson.fromJson(reader, new TypeToken<Map<String, Object>>(){}.getType());
            return map == null ? new HashMap<>() : map;
        } catch (JsonSyntaxException e) {
            throw new ApiError(400, "Invalid JSON body");
        } catch (Exception e) {
            throw new ApiError(500, "Error reading request body");
        }
    }
}