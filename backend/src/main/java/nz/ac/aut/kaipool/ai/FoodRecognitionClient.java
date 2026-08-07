package nz.ac.aut.kaipool.ai;

import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

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
            @Value("${app.ai.model:gemini-3.6-flash}") String model) {
        this.restClient = RestClient.create("https://generativelanguage.googleapis.com/v1beta");
        this.apiKey = apiKey;
        this.model = model;
    }

    public String recognize(byte[] image, String contentType) {
        if (apiKey.isBlank()) {
            throw new FoodRecognitionException("Food recognition is not configured. Set GEMINI_API_KEY.");
        }

        String imageData = Base64.getEncoder().encodeToString(image);

        try {
            Map<?, ?> response = restClient.post()
                    .uri("/interactions")
                    .header("x-goog-api-key", apiKey)
                    .body(requestBody(imageData, contentType))
                    .retrieve()
                    .body(Map.class);
            return readOutputText(response);
        } catch (FoodRecognitionException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 429) {
                throw new FoodRecognitionException(
                        "The free food recognition limit was reached. Try again shortly.",
                        exception);
            }
            if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403) {
                throw new FoodRecognitionException(
                        "Food recognition is not configured correctly. Check GEMINI_API_KEY.",
                        exception);
            }
            throw new FoodRecognitionException("The food recognition service is unavailable. Try again.", exception);
        } catch (RestClientException exception) {
            throw new FoodRecognitionException("The food recognition service is unavailable. Try again.", exception);
        }
    }

    private Map<String, Object> requestBody(String imageData, String contentType) {
        Map<String, Object> nullableString = Map.of(
                "anyOf", List.of(
                        Map.of("type", "string"),
                        Map.of("type", "null")));
        Map<String, Object> nullableConfidence = Map.of(
                "anyOf", List.of(
                        Map.of("type", "number", "minimum", 0, "maximum", 1),
                        Map.of("type", "null")));
        Map<String, Object> itemSchema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "name", Map.of("type", "string"),
                        "quantity", nullableString,
                        "confidence", nullableConfidence),
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
                "store", false,
                "input", List.of(
                        Map.of("type", "text", "text", PROMPT),
                        Map.of(
                                "type", "image",
                                "data", imageData,
                                "mime_type", contentType)),
                "response_format", Map.of(
                        "type", "text",
                        "mime_type", "application/json",
                        "schema", schema));
    }

    private String readOutputText(Map<?, ?> response) {
        if (response == null || !(response.get("steps") instanceof List<?> steps)) {
            throw new FoodRecognitionException("The food recognition service returned an invalid response.");
        }

        String outputText = null;
        for (Object stepItem : steps) {
            if (!(stepItem instanceof Map<?, ?> step)
                    || !"model_output".equals(step.get("type"))
                    || !(step.get("content") instanceof List<?> content)) {
                continue;
            }
            for (Object contentItem : content) {
                if (contentItem instanceof Map<?, ?> part
                        && "text".equals(part.get("type"))
                        && part.get("text") instanceof String text
                        && !text.isBlank()) {
                    outputText = text;
                }
            }
        }

        if (outputText != null) {
            return outputText;
        }
        throw new FoodRecognitionException("The food recognition service did not return any results.");
    }
}
