package nz.ac.aut.kaipool.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.service.CollaborativeRecipeGenerator.RecipeGenerationRequest;
import nz.ac.aut.kaipool.service.MatchingService.MatchContext;

@Service
public class CollaborativeRecipeService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CollaborativeRecipeService.class);
    private static final int TARGET_MEAL_COUNT = 3;

    private final MatchingService matchingService;
    private final CollaborativeRecipeGenerator recipeGenerator;
    private final CollaborativeRecipeCache recipeCache;
    private final MealVisualService mealVisualService;

    public CollaborativeRecipeService(
            MatchingService matchingService,
            CollaborativeRecipeGenerator recipeGenerator,
            CollaborativeRecipeCache recipeCache,
            MealVisualService mealVisualService) {
        this.matchingService = matchingService;
        this.recipeGenerator = recipeGenerator;
        this.recipeCache = recipeCache;
        this.mealVisualService = mealVisualService;
    }

    public synchronized List<CollaborativeMealResponse> generateForMatch(String email, Long matchedUserId) {
        MatchContext requestedMatch = matchingService.getRequiredMatch(email, matchedUserId);
        boolean reverseForRequester = shouldReverse(requestedMatch);
        MatchContext match = reverseForRequester ? reverse(requestedMatch) : requestedMatch;
        RecipeGenerationRequest request = new RecipeGenerationRequest(
                foodNames(match.currentUserFoods()),
                foodNames(match.otherUserFoods()),
                selectedCultures(match.currentUser()),
                selectedCultures(match.otherUser()));

        var cached = recipeCache.get(request);
        if (cached.isPresent()) {
            List<CollaborativeMealResponse> stored = cached.get();
            if (stored.stream().allMatch(meal -> "Pexels".equals(meal.imageSource())
                    && meal.imageUrl() != null && !meal.imageUrl().isBlank())) {
                return reverseForRequester ? flipOwnership(stored) : stored;
            }
            List<CollaborativeMealResponse> enriched = mealVisualService.addImages(stored);
            recipeCache.put(request, enriched);
            return reverseForRequester ? flipOwnership(enriched) : enriched;
        }

        List<CollaborativeMealResponse> generated;
        try {
            generated = recipeGenerator.generate(request);
        } catch (RuntimeException exception) {
            LOGGER.warn("Gemini recipe generation failed; using deterministic meal suggestions", exception);
            generated = List.of();
        }

        Map<String, CollaborativeMealResponse> meals = new LinkedHashMap<>();
        if (generated == null) {
            generated = List.of();
        }
        generated.stream()
                .map(meal -> cleanGeneratedMeal(meal, match.currentUserFoods(), match.otherUserFoods()))
                .filter(meal -> meal != null)
                .forEach(meal -> meals.putIfAbsent(normalizeKey(meal.mealName()), meal));

        fallbackMeals(match).forEach(meal -> meals.putIfAbsent(normalizeKey(meal.mealName()), meal));
        List<CollaborativeMealResponse> result = mealVisualService.addImages(
                meals.values().stream().limit(TARGET_MEAL_COUNT).toList());
        recipeCache.put(request, result);
        return reverseForRequester ? flipOwnership(result) : result;
    }

    private static boolean shouldReverse(MatchContext match) {
        Long currentId = match.currentUser().getId();
        Long otherId = match.otherUser().getId();
        if (currentId != null && otherId != null) {
            return currentId > otherId;
        }
        return match.currentUser().getEmail().compareToIgnoreCase(match.otherUser().getEmail()) > 0;
    }

    private static MatchContext reverse(MatchContext match) {
        List<CollaborativeMealCatalog.ScoredMeal> reversedMeals = match.usefulMeals().stream()
                .map(meal -> new CollaborativeMealCatalog.ScoredMeal(
                        meal.template(),
                        meal.foodsFromThem(),
                        meal.foodsFromYou(),
                        meal.optionalMissingIngredients(),
                        meal.score()))
                .toList();
        return new MatchContext(
                match.otherUser(),
                match.currentUser(),
                match.otherUserFoods(),
                match.currentUserFoods(),
                reversedMeals,
                null);
    }

    private static List<CollaborativeMealResponse> flipOwnership(List<CollaborativeMealResponse> meals) {
        return meals.stream().map(meal -> new CollaborativeMealResponse(
                meal.mealName(),
                meal.description(),
                meal.culturalOriginOrInspiration(),
                meal.ingredientsFromThem(),
                meal.ingredientsFromYou(),
                meal.optionalMissingIngredients(),
                meal.cookingInstructions(),
                meal.imageUrl(),
                meal.imageSource(),
                meal.imageAttribution())).toList();
    }

    private CollaborativeMealResponse cleanGeneratedMeal(
            CollaborativeMealResponse meal,
            List<Food> yourFoods,
            List<Food> theirFoods) {
        if (meal == null || blank(meal.mealName())) {
            return null;
        }
        List<String> yours = resolveOwnedIngredients(meal.ingredientsFromYou(), yourFoods);
        List<String> theirs = resolveOwnedIngredients(meal.ingredientsFromThem(), theirFoods);
        if (yours.isEmpty() || theirs.isEmpty()) {
            return null;
        }
        List<String> instructions = cleanStrings(meal.cookingInstructions(), 6);
        if (instructions.isEmpty()) {
            instructions = standardInstructions(yours, theirs);
        }
        return new CollaborativeMealResponse(
                cleanText(meal.mealName(), 100),
                blank(meal.description())
                        ? "A collaborative meal built around ingredients from both food pools."
                        : cleanText(meal.description(), 240),
                blank(meal.culturalOriginOrInspiration())
                        ? "Shared kitchen inspiration"
                        : cleanText(meal.culturalOriginOrInspiration(), 120),
                yours,
                theirs,
                missingOnly(meal.optionalMissingIngredients(), yourFoods, theirFoods),
                instructions,
                null,
                null,
                null);
    }

    private List<CollaborativeMealResponse> fallbackMeals(MatchContext match) {
        List<CollaborativeMealResponse> meals = new ArrayList<>();
        match.usefulMeals().forEach(scored -> meals.add(new CollaborativeMealResponse(
                scored.template().name(),
                "A practical " + scored.template().name().toLowerCase(Locale.ROOT)
                        + " made collaboratively from both food pools.",
                scored.template().culture(),
                foodNames(scored.foodsFromYou()),
                foodNames(scored.foodsFromThem()),
                scored.optionalMissingIngredients(),
                standardInstructions(foodNames(scored.foodsFromYou()), foodNames(scored.foodsFromThem())),
                null,
                null,
                null)));

        List<String> yours = foodNames(match.currentUserFoods()).stream().limit(3).toList();
        List<String> theirs = foodNames(match.otherUserFoods()).stream().limit(3).toList();
        if (meals.size() < TARGET_MEAL_COUNT) {
            meals.add(new CollaborativeMealResponse(
                    "Shared ingredient bowl",
                    "A flexible bowl that combines the best ingredients from both food pools.",
                    "Flexible home-style",
                    yours,
                    theirs,
                    missingOnly(List.of("rice", "a favourite sauce"),
                            match.currentUserFoods(), match.otherUserFoods()),
                    standardInstructions(yours, theirs),
                    null,
                    null,
                    null));
        }
        if (meals.size() < TARGET_MEAL_COUNT) {
            meals.add(new CollaborativeMealResponse(
                    "Collaborative skillet meal",
                    "A quick one-pan meal designed to use what both cooks already have.",
                    "Flexible shared-kitchen inspiration",
                    yours,
                    theirs,
                    missingOnly(List.of("onion or garlic", "seasoning to taste"),
                            match.currentUserFoods(), match.otherUserFoods()),
                    standardInstructions(yours, theirs),
                    null,
                    null,
                    null));
        }
        return meals;
    }

    private static List<String> standardInstructions(List<String> yours, List<String> theirs) {
        return List.of(
                "Wash and prepare the ingredients from both food pools.",
                "Cook any meat or eggs thoroughly before combining everything.",
                "Add the remaining ingredients and cook until tender and hot throughout.",
                "Season to taste, divide into two portions, and serve together.");
    }

    private static List<String> resolveOwnedIngredients(List<String> claimed, List<Food> foods) {
        if (claimed == null) {
            return List.of();
        }
        LinkedHashSet<String> resolved = new LinkedHashSet<>();
        claimed.stream()
                .filter(value -> value != null)
                .map(value -> foods.stream()
                        .filter(food -> CollaborativeMealCatalog.ingredientMatches(food.getName(), value)
                                || CollaborativeMealCatalog.ingredientMatches(value, food.getName()))
                        .map(Food::getName)
                        .findFirst()
                        .orElse(null))
                .filter(value -> value != null)
                .forEach(resolved::add);
        return resolved.stream().limit(8).toList();
    }

    private static List<String> missingOnly(List<String> values, List<Food> yourFoods, List<Food> theirFoods) {
        List<Food> available = new ArrayList<>(yourFoods);
        available.addAll(theirFoods);
        return cleanStrings(values, 6).stream()
                .filter(value -> available.stream().noneMatch(food ->
                        CollaborativeMealCatalog.ingredientMatches(food.getName(), value)
                                || CollaborativeMealCatalog.ingredientMatches(value, food.getName())))
                .toList();
    }

    private static Set<String> selectedCultures(User user) {
        LinkedHashSet<String> cultures = new LinkedHashSet<>(user.getFoodCultures());
        cultures.addAll(user.getFoodCulturesToExplore());
        return Set.copyOf(cultures);
    }

    private static List<String> foodNames(List<Food> foods) {
        return foods.stream().map(Food::getName).distinct().toList();
    }

    private static List<String> cleanStrings(List<String> values, int limit) {
        if (values == null) {
            return List.of();
        }
        LinkedHashSet<String> cleaned = new LinkedHashSet<>();
        values.stream()
                .filter(value -> !blank(value))
                .map(value -> cleanText(value, 240))
                .forEach(cleaned::add);
        return cleaned.stream().limit(limit).toList();
    }

    private static String cleanText(String value, int maxLength) {
        String cleaned = value.trim().replaceAll("\\s+", " ");
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength).trim();
    }

    private static String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
