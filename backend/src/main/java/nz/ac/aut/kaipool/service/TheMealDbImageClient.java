package nz.ac.aut.kaipool.service;

import java.text.Normalizer;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class TheMealDbImageClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(TheMealDbImageClient.class);
    private static final Set<String> IGNORED_WORDS = Set.of("a", "an", "and", "of", "the", "with");

    private final RestClient restClient;
    private final String apiKey;
    private final boolean enabled;

    public TheMealDbImageClient(
            @Value("${app.meal-images.themealdb.api-key:1}") String apiKey,
            @Value("${app.meal-images.themealdb.enabled:true}") boolean enabled) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder()
                .baseUrl("https://www.themealdb.com")
                .requestFactory(requestFactory)
                .build();
        this.apiKey = apiKey.isBlank() ? "1" : apiKey;
        this.enabled = enabled;
    }

    public Optional<ExternalMealImage> findRelevantImage(String mealName, List<String> availableIngredients) {
        if (!enabled || mealName == null || mealName.isBlank()) {
            return Optional.empty();
        }
        try {
            Map<?, ?> response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/json/v1/{apiKey}/search.php")
                            .queryParam("s", mealName)
                            .build(apiKey))
                    .retrieve()
                    .body(Map.class);
            if (response == null || !(response.get("meals") instanceof List<?> meals)) {
                return Optional.empty();
            }
            return meals.stream()
                    .filter(Map.class::isInstance)
                    .map(Map.class::cast)
                    .filter(candidate -> isRelevant(mealName, availableIngredients, candidate))
                    .map(this::toImage)
                    .flatMap(Optional::stream)
                    .findFirst();
        } catch (RestClientException | IllegalArgumentException exception) {
            LOGGER.info("TheMealDB image lookup was unavailable for {}", mealName);
            return Optional.empty();
        }
    }

    private boolean isRelevant(String requestedName, List<String> availableIngredients, Map<?, ?> candidate) {
        Object candidateName = candidate.get("strMeal");
        if (!(candidateName instanceof String name) || tokenSimilarity(requestedName, name) < 0.6) {
            return false;
        }
        Set<String> availableTokens = tokens(String.join(" ", availableIngredients));
        if (availableTokens.isEmpty()) {
            return true;
        }
        Set<String> candidateIngredientTokens = new LinkedHashSet<>();
        for (int index = 1; index <= 20; index++) {
            Object ingredient = candidate.get("strIngredient" + index);
            if (ingredient instanceof String value) {
                candidateIngredientTokens.addAll(tokens(value));
            }
        }
        long overlap = availableTokens.stream().filter(candidateIngredientTokens::contains).count();
        return overlap >= Math.min(2, availableTokens.size());
    }

    private Optional<ExternalMealImage> toImage(Map<?, ?> meal) {
        Object image = meal.get("strMealThumb");
        Object name = meal.get("strMeal");
        if (!(image instanceof String imageUrl) || imageUrl.isBlank() || !(name instanceof String matchedName)) {
            return Optional.empty();
        }
        return Optional.of(new ExternalMealImage(
                imageUrl,
                "TheMealDB",
                "Photo: " + matchedName + " · TheMealDB"));
    }

    private static double tokenSimilarity(String first, String second) {
        Set<String> firstTokens = tokens(first);
        Set<String> secondTokens = tokens(second);
        if (firstTokens.isEmpty() || secondTokens.isEmpty()) {
            return 0;
        }
        long overlap = firstTokens.stream().filter(secondTokens::contains).count();
        return overlap / (double) Math.min(firstTokens.size(), secondTokens.size());
    }

    private static Set<String> tokens(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
        LinkedHashSet<String> tokens = new LinkedHashSet<>();
        Arrays.stream(normalized.split(" "))
                .filter(token -> !token.isBlank() && !IGNORED_WORDS.contains(token))
                .map(TheMealDbImageClient::singular)
                .forEach(tokens::add);
        return tokens;
    }

    private static String singular(String value) {
        if (value.endsWith("ies") && value.length() > 4) {
            return value.substring(0, value.length() - 3) + "y";
        }
        if (value.endsWith("s") && !value.endsWith("ss") && value.length() > 3) {
            return value.substring(0, value.length() - 1);
        }
        return value;
    }

    public record ExternalMealImage(String imageUrl, String source, String attribution) {
    }
}
