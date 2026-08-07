package nz.ac.aut.kaipool.ai;

import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import nz.ac.aut.kaipool.exception.FoodRecognitionException;

@Component
public class FoodRecognitionClient {

    private static final String PROMPT = """
            Identify only food items that are clearly visible in this image.
            Do not infer hidden ingredients, recipes, brands, nutrition, or advice.
            Use a short everyday name for each item. Estimate quantity only when visible.
            Return only the requested JSON structure. If no food is visible, return an empty items array.
            """;

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public FoodRecognitionClient(
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.model:gpt-4o-mini}") String model) {
        this.restClient = RestClient.create("https://api.openai.com/v1");
        this.apiKey = apiKey;
        this.model = model;
    }

    public String recognize(byte[] image, String contentType) {
        if (apiKey.isBlank()) {
            throw new FoodRecognitionException("Food recognition is not configured. Set AI_API_KEY.");
        }

        String dataUrl = "data:%s;base64,%s".formatted(
                contentType,
                Base64.getEncoder().encodeToString(image));

        try {
            Map<?, ?> response = restClient.post()
                    .uri("/responses")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .body(requestBody(dataUrl))
                    .retrieve()
                    .body(Map.class);
            return readOutputText(response);
        } catch (FoodRecognitionException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new FoodRecognitionException("The food recognition service is unavailable. Try again.", exception);
        }
    }

    private Map<String, Object> requestBody(String dataUrl) {
        Map<String, Object> itemSchema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "name", Map.of("type", "string"),
                        "quantity", Map.of("type", List.of("string", "null")),
                        "confidence", Map.of(
                                "type", List.of("number", "null"),
                                "minimum", 0,
                                "maximum", 1)),
                "required", List.of("name", "quantity", "confidence"),
                "additionalProperties", false);
        Map<String, Object> schema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "items", Map.of(
                                "type", "array",
                                "items", itemSchema)),
                "required", List.of("items"),
                "additionalProperties", false);

        return Map.of(
                "model", model,
                "input", List.of(Map.of(
                        "role", "user",
                        "content", List.of(
                                Map.of("type", "input_text", "text", PROMPT),
                                Map.of("type", "input_image", "image_url", dataUrl, "detail", "low")))),
                "text", Map.of("format", Map.of(
                        "type", "json_schema",
                        "name", "food_recognition",
                        "strict", true,
                        "schema", schema)),
                "max_output_tokens", 500);
    }

    private String readOutputText(Map<?, ?> response) {
        if (response == null || !(response.get("output") instanceof List<?> output)) {
            throw new FoodRecognitionException("The food recognition service returned an invalid response.");
        }

        for (Object outputItem : output) {
            if (!(outputItem instanceof Map<?, ?> item)
                    || !(item.get("content") instanceof List<?> content)) {
                continue;
            }
            for (Object contentItem : content) {
                if (contentItem instanceof Map<?, ?> part
                        && "output_text".equals(part.get("type"))
                        && part.get("text") instanceof String text
                        && !text.isBlank()) {
                    return text;
                }
            }
        }

        throw new FoodRecognitionException("The food recognition service did not return any results.");
    }
}
