package nz.ac.aut.kaipool.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.domain.CollaborativeRecipeCacheEntry;
import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.repository.CollaborativeRecipeCacheRepository;
import nz.ac.aut.kaipool.service.CollaborativeRecipeGenerator.RecipeGenerationRequest;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class CollaborativeRecipeCache {

    private static final String CACHE_VERSION = "collaborative-recipes-v1";

    private final CollaborativeRecipeCacheRepository repository;
    private final ObjectMapper objectMapper;
    private final String recipeModel;

    public CollaborativeRecipeCache(
            CollaborativeRecipeCacheRepository repository,
            ObjectMapper objectMapper,
            @Value("${app.ai.recipe-model:gemini-3.5-flash-lite}") String recipeModel) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.recipeModel = recipeModel;
    }

    @Transactional
    public Optional<List<CollaborativeMealResponse>> get(RecipeGenerationRequest request) {
        String fingerprint = fingerprint(request);
        return repository.findById(fingerprint).flatMap(entry -> {
            try {
                CachedMeals cached = objectMapper.readValue(entry.getMealsJson(), CachedMeals.class);
                return cached.meals() == null ? Optional.empty() : Optional.of(List.copyOf(cached.meals()));
            } catch (JacksonException exception) {
                repository.delete(entry);
                return Optional.empty();
            }
        });
    }

    @Transactional
    public void put(RecipeGenerationRequest request, List<CollaborativeMealResponse> meals) {
        try {
            String json = objectMapper.writeValueAsString(new CachedMeals(List.copyOf(meals)));
            repository.save(new CollaborativeRecipeCacheEntry(fingerprint(request), json));
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not cache collaborative recipes", exception);
        }
    }

    String fingerprint(RecipeGenerationRequest request) {
        String source = String.join("\n",
                CACHE_VERSION,
                recipeModel,
                sorted(request.currentUserIngredients()),
                sorted(request.currentUserCultures()),
                sorted(request.matchedUserIngredients()),
                sorted(request.matchedUserCultures()));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private static String sorted(Iterable<String> values) {
        java.util.ArrayList<String> sorted = new java.util.ArrayList<>();
        values.forEach(value -> sorted.add(value.trim().toLowerCase(java.util.Locale.ROOT)));
        sorted.sort(String::compareTo);
        return String.join("|", sorted);
    }

    private record CachedMeals(List<CollaborativeMealResponse> meals) {
    }
}
