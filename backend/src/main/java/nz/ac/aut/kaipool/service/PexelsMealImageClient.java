package nz.ac.aut.kaipool.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class PexelsMealImageClient {

    private final RestClient restClient = RestClient.create("https://api.pexels.com");
    private final String apiKey;

    public PexelsMealImageClient(@Value("${app.meal-images.pexels.api-key:}") String apiKey) {
        this.apiKey = apiKey;
    }

    public Optional<PexelsMealImage> search(String mealName) {
        if (apiKey.isBlank() || mealName == null || mealName.isBlank()) return Optional.empty();
        try {
            Map<?, ?> response = restClient.get()
                    .uri(builder -> builder.path("/v1/search")
                            .queryParam("query", mealName + " plated food")
                            .queryParam("orientation", "landscape")
                            .queryParam("size", "large")
                            .queryParam("per_page", 3)
                            .build())
                    .header("Authorization", apiKey)
                    .retrieve().body(Map.class);
            if (response == null || !(response.get("photos") instanceof List<?> photos)) return Optional.empty();
            return photos.stream().filter(Map.class::isInstance).map(Map.class::cast)
                    .map(PexelsMealImageClient::toImage).flatMap(Optional::stream).findFirst();
        } catch (RestClientException exception) {
            return Optional.empty();
        }
    }

    private static Optional<PexelsMealImage> toImage(Map<?, ?> photo) {
        if (!(photo.get("src") instanceof Map<?, ?> sources)) return Optional.empty();
        String imageUrl = text(sources.get("large2x"));
        if (imageUrl.isBlank()) imageUrl = text(sources.get("large"));
        String photographer = text(photo.get("photographer"));
        if (imageUrl.isBlank() || photographer.isBlank()) return Optional.empty();
        return Optional.of(new PexelsMealImage(imageUrl, "Photo by " + photographer + " on Pexels"));
    }

    private static String text(Object value) {
        return value instanceof String text ? text.trim() : "";
    }

    public record PexelsMealImage(String imageUrl, String attribution) {
    }
}
