package nz.ac.aut.kaipool.service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import nz.ac.aut.kaipool.ai.GeminiCollaborativeRecipeGenerator;
import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.service.CollaborativeMealCatalog.ScoredMeal;
import nz.ac.aut.kaipool.service.CollaborativeRecipeGenerator.RecipeGenerationRequest;

@Service
public class MatchMealSuggestionService {

    private final GeminiCollaborativeRecipeGenerator generator;
    private final CollaborativeRecipeCache cache;
    private final PexelsMealImageLookup pexels;
    private final MealVisualCatalog visuals;

    public MatchMealSuggestionService(
            GeminiCollaborativeRecipeGenerator generator,
            CollaborativeRecipeCache cache,
            PexelsMealImageLookup pexels,
            MealVisualCatalog visuals) {
        this.generator = generator;
        this.cache = cache;
        this.pexels = pexels;
        this.visuals = visuals;
    }

    public Map<Long, CollaborativeMealResponse> suggest(List<SuggestionRequest> requests) {
        Map<Long, CollaborativeMealResponse> result = new LinkedHashMap<>();
        Map<Long, RecipeGenerationRequest> missing = new LinkedHashMap<>();
        Map<Long, SuggestionRequest> byId = new LinkedHashMap<>();
        for (SuggestionRequest request : requests) {
            byId.put(request.matchedUserId(), request);
            cache.get(request.recipeRequest()).filter(meals -> !meals.isEmpty())
                    .ifPresentOrElse(meals -> result.put(request.matchedUserId(), request.toRequester(meals.getFirst())),
                            () -> missing.put(request.matchedUserId(), request.recipeRequest()));
        }

        Map<Long, CollaborativeMealResponse> generated;
        try {
            generated = generator.generateBatch(missing);
        } catch (RuntimeException exception) {
            generated = Map.of();
        }
        for (Long id : missing.keySet()) {
            SuggestionRequest request = byId.get(id);
            CollaborativeMealResponse meal = clean(generated.get(id), request);
            if (meal == null) meal = fallback(request);
            cache.put(request.recipeRequest(), List.of(meal));
            result.put(id, request.toRequester(meal));
        }

        result.replaceAll((id, meal) -> {
            var photo = pexels.find(meal.mealName());
            return photo.map(image -> withImage(
                            meal, image.imageUrl(), "Pexels", image.attribution()))
                    .orElseGet(() -> withImage(meal, null, null, null));
        });
        return Map.copyOf(result);
    }

    private CollaborativeMealResponse clean(CollaborativeMealResponse meal, SuggestionRequest request) {
        if (meal == null || meal.mealName() == null || meal.mealName().isBlank()) return null;
        List<String> yours = resolve(meal.ingredientsFromYou(), request.canonicalYourFoods());
        List<String> theirs = resolve(meal.ingredientsFromThem(), request.canonicalTheirFoods());
        if (yours.isEmpty() || theirs.isEmpty()) return null;
        List<String> steps = meal.cookingInstructions() == null ? List.of() : meal.cookingInstructions().stream()
                .filter(value -> value != null && !value.isBlank()).limit(6).toList();
        if (steps.isEmpty()) steps = standardSteps();
        return new CollaborativeMealResponse(
                meal.mealName().trim(),
                meal.description() == null || meal.description().isBlank()
                        ? "A meal made together from both food pools." : meal.description().trim(),
                meal.culturalOriginOrInspiration() == null ? "Shared kitchen inspiration"
                        : meal.culturalOriginOrInspiration().trim(),
                yours, theirs,
                meal.optionalMissingIngredients() == null ? List.of()
                        : meal.optionalMissingIngredients().stream().filter(value -> value != null && !value.isBlank())
                                .distinct().limit(6).toList(),
                steps, null, null, null);
    }

    private CollaborativeMealResponse fallback(SuggestionRequest request) {
        ScoredMeal meal = request.fallback();
        List<String> requesterFoods = meal.foodsFromYou().stream().map(Food::getName).toList();
        List<String> matchedFoods = meal.foodsFromThem().stream().map(Food::getName).toList();
        List<String> canonicalYours = request.reversed() ? matchedFoods : requesterFoods;
        List<String> canonicalTheirs = request.reversed() ? requesterFoods : matchedFoods;
        return new CollaborativeMealResponse(
                meal.template().name(), visuals.descriptionFor(meal.template().name()), meal.template().culture(),
                canonicalYours, canonicalTheirs,
                meal.optionalMissingIngredients(), standardSteps(), null, null, null);
    }

    private static List<String> resolve(List<String> claimed, List<Food> foods) {
        if (claimed == null) return List.of();
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (String value : claimed) {
            if (value == null) continue;
            foods.stream().filter(food -> CollaborativeMealCatalog.ingredientMatches(food.getName(), value)
                    || CollaborativeMealCatalog.ingredientMatches(value, food.getName()))
                    .findFirst().map(Food::getName).ifPresent(result::add);
        }
        return result.stream().limit(8).toList();
    }

    private static List<String> standardSteps() {
        return List.of("Prepare the ingredients from both food pools.",
                "Cook everything safely until tender and hot throughout.", "Season to taste and serve together.");
    }

    private static CollaborativeMealResponse withImage(
            CollaborativeMealResponse meal, String url, String source, String attribution) {
        return new CollaborativeMealResponse(meal.mealName(), meal.description(), meal.culturalOriginOrInspiration(),
                meal.ingredientsFromYou(), meal.ingredientsFromThem(), meal.optionalMissingIngredients(),
                meal.cookingInstructions(), url, source, attribution);
    }

    public record SuggestionRequest(
            Long currentUserId,
            Long matchedUserId,
            List<Food> yourFoods,
            List<Food> theirFoods,
            Set<String> yourCultures,
            Set<String> theirCultures,
            ScoredMeal fallback) {
        RecipeGenerationRequest recipeRequest() {
            return new RecipeGenerationRequest(
                    canonicalYourFoods().stream().map(Food::getName).distinct().toList(),
                    canonicalTheirFoods().stream().map(Food::getName).distinct().toList(),
                    reversed() ? theirCultures : yourCultures,
                    reversed() ? yourCultures : theirCultures);
        }

        boolean reversed() {
            return currentUserId > matchedUserId;
        }

        List<Food> canonicalYourFoods() {
            return reversed() ? theirFoods : yourFoods;
        }

        List<Food> canonicalTheirFoods() {
            return reversed() ? yourFoods : theirFoods;
        }

        CollaborativeMealResponse toRequester(CollaborativeMealResponse meal) {
            if (!reversed()) return meal;
            return new CollaborativeMealResponse(meal.mealName(), meal.description(),
                    meal.culturalOriginOrInspiration(), meal.ingredientsFromThem(), meal.ingredientsFromYou(),
                    meal.optionalMissingIngredients(), meal.cookingInstructions(), meal.imageUrl(),
                    meal.imageSource(), meal.imageAttribution());
        }
    }
}
