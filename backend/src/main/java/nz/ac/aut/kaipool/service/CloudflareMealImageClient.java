package nz.ac.aut.kaipool.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;

@Component
public class CloudflareMealImageClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(CloudflareMealImageClient.class);

    private final RestClient restClient;
    private final String accountId;
    private final String apiToken;
    private final String model;

    public CloudflareMealImageClient(
            @Value("${app.meal-images.cloudflare.account-id:}") String accountId,
            @Value("${app.meal-images.cloudflare.api-token:}") String apiToken,
            @Value("${app.meal-images.cloudflare.model:@cf/black-forest-labs/flux-1-schnell}") String model) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        this.restClient = RestClient.builder()
                .baseUrl("https://api.cloudflare.com")
                .requestFactory(requestFactory)
                .build();
        this.accountId = accountId.trim();
        this.apiToken = apiToken.trim();
        this.model = model.trim();
    }

    public boolean isConfigured() {
        return !accountId.isBlank() && !apiToken.isBlank() && !model.isBlank();
    }

    public Optional<GeneratedMealImage> generate(CollaborativeMealResponse meal) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        String prompt = """
                Editorial food photography for a community cooking app. A realistic, freshly cooked %s,
                inspired by %s, visibly featuring %s. Natural daylight, warm inviting colours,
                overhead three-quarter angle, ceramic serving dish, no people, no text, no logos,
                no packaging, landscape 16:9 composition.
                """.formatted(
                meal.mealName(),
                meal.culturalOriginOrInspiration(),
                String.join(", ", combinedIngredients(meal)));
        try {
            URI uri = URI.create("https://api.cloudflare.com/client/v4/accounts/"
                    + accountId + "/ai/run/" + model);
            Map<?, ?> response = restClient.post()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiToken)
                    .body(Map.of(
                            "prompt", prompt,
                            "steps", 4))
                    .retrieve()
                    .body(Map.class);
            String encoded = readBase64Image(response);
            if (encoded == null || encoded.isBlank()) {
                return Optional.empty();
            }
            byte[] bytes = Base64.getDecoder().decode(encoded);
            return Optional.of(new GeneratedMealImage("image/jpeg", bytes));
        } catch (RestClientException | IllegalArgumentException exception) {
            LOGGER.warn("Cloudflare could not generate a meal image for {}", meal.mealName());
            return Optional.empty();
        }
    }

    static String readBase64Image(Map<?, ?> response) {
        if (response == null) {
            return null;
        }
        Object result = response.get("result");
        if (result instanceof Map<?, ?> resultMap && resultMap.get("image") instanceof String image) {
            return image;
        }
        if (response.get("image") instanceof String image) {
            return image;
        }
        return null;
    }

    private static List<String> combinedIngredients(CollaborativeMealResponse meal) {
        return java.util.stream.Stream.concat(
                        meal.ingredientsFromYou().stream(),
                        meal.ingredientsFromThem().stream())
                .distinct()
                .limit(8)
                .toList();
    }

    public record GeneratedMealImage(String contentType, byte[] bytes) {
        public GeneratedMealImage {
            bytes = bytes.clone();
        }

        @Override
        public byte[] bytes() {
            return bytes.clone();
        }
    }
}
