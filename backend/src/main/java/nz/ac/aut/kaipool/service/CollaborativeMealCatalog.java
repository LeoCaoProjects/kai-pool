package nz.ac.aut.kaipool.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Component;

import nz.ac.aut.kaipool.domain.Food;

@Component
public class CollaborativeMealCatalog {

    private static final Set<String> PANTRY_STAPLES = Set.of(
            "oil", "salt", "pepper", "water", "stock", "broth", "soy sauce", "garlic", "spice");

    private static final List<MealTemplate> TEMPLATES = List.of(
            meal("Chicken fried rice", "Chinese-inspired",
                    "chicken", "rice", "egg|eggs", "carrot|carrots", "spring onion|spring onions|scallion", "soy sauce"),
            meal("Egg fried rice", "Chinese-inspired",
                    "rice", "egg|eggs", "spring onion|spring onions|scallion", "carrot|carrots", "soy sauce"),
            meal("Roast chicken with root vegetables", "Aotearoa home-style",
                    "chicken", "kumara|sweet potato|potato|potatoes", "carrot|carrots", "onion|onions", "oil"),
            meal("Kūmara and egg hash", "Aotearoa-inspired",
                    "kumara|sweet potato", "egg|eggs", "onion|onions", "spring onion|spring onions|scallion", "oil"),
            meal("Chicken curry and rice", "Indian-inspired",
                    "chicken", "rice", "tomato|tomatoes", "onion|onions", "curry powder|garam masala", "garlic"),
            meal("Shakshuka", "Middle Eastern and North African-inspired",
                    "egg|eggs", "tomato|tomatoes", "onion|onions", "capsicum|bell pepper", "garlic"),
            meal("Vegetable frittata", "Italian-inspired",
                    "egg|eggs", "potato|potatoes|kumara", "tomato|tomatoes", "onion|onions", "cheese"),
            meal("Chicken noodle soup", "Comfort-food inspired",
                    "chicken", "noodle|noodles", "carrot|carrots", "onion|onions", "broth|stock"),
            meal("Hearty vegetable soup", "Home-style",
                    "carrot|carrots", "potato|potatoes|kumara", "tomato|tomatoes", "cabbage|greens", "onion|onions", "stock"),
            meal("Minestrone", "Italian-inspired",
                    "tomato|tomatoes", "carrot|carrots", "bean|beans", "pasta", "onion|onions", "stock"),
            meal("Pasta primavera", "Italian-inspired",
                    "pasta", "tomato|tomatoes", "carrot|carrots", "capsicum|bell pepper", "onion|onions", "cheese"),
            meal("Bread and vegetable omelette", "South Asian-inspired",
                    "bread", "egg|eggs", "tomato|tomatoes", "onion|onions", "spring onion|spring onions", "oil"),
            meal("Chicken and vegetable stir-fry", "East Asian-inspired",
                    "chicken", "carrot|carrots", "capsicum|bell pepper", "cabbage|broccoli", "rice|noodles", "soy sauce"),
            meal("Tomato rice bowl", "Mediterranean-inspired",
                    "rice", "tomato|tomatoes", "egg|eggs|chicken|beans", "onion|onions", "herb|herbs", "oil"),
            meal("Loaded baked kūmara", "Aotearoa-inspired",
                    "kumara|sweet potato", "bean|beans|chicken", "tomato|tomatoes", "cheese", "spring onion|spring onions"),
            meal("Vegetable rice soup", "Comfort-food inspired",
                    "rice", "carrot|carrots", "tomato|tomatoes", "onion|onions", "egg|eggs|chicken", "stock"),
            meal("Oyakodon chicken rice bowl", "Japanese-inspired",
                    "chicken", "rice", "egg|eggs", "onion|onions", "soy sauce"),
            meal("Korean chicken noodle bowl", "Korean-inspired",
                    "chicken", "noodle|noodles", "cabbage", "spring onion|spring onions", "soy sauce"),
            meal("Baked tomato and cheese pasta", "Italian-inspired",
                    "pasta", "tomato|tomatoes", "cheese", "onion|onions"),
            meal("Spanish potato tortilla", "Spanish-inspired",
                    "potato|potatoes", "egg|eggs", "onion|onions", "oil"),
            meal("Mexican rice and beans", "Mexican-inspired",
                    "rice", "bean|beans", "tomato|tomatoes", "onion|onions", "capsicum|bell pepper"),
            meal("Aloo egg curry", "Indian-inspired",
                    "potato|potatoes", "egg|eggs", "tomato|tomatoes", "onion|onions", "curry powder|garam masala"),
            meal("Mediterranean vegetable pasta", "Mediterranean-inspired",
                    "pasta", "tomato|tomatoes", "capsicum|bell pepper", "cheese", "onion|onions"),
            meal("Chicken and broccoli noodles", "East Asian-inspired",
                    "chicken", "broccoli", "noodle|noodles", "spring onion|spring onions", "soy sauce"),
            meal("Cabbage and potato hash", "Home-style",
                    "cabbage", "potato|potatoes", "onion|onions", "egg|eggs", "oil"),
            meal("Tomato cheese toast", "Cafe-inspired",
                    "bread", "tomato|tomatoes", "cheese", "egg|eggs"),
            meal("Kumara chicken tray bake", "Aotearoa-inspired",
                    "kumara|sweet potato", "chicken", "carrot|carrots", "onion|onions", "oil"),
            meal("Egg and tomato rice bowl", "Chinese-inspired",
                    "egg|eggs", "tomato|tomatoes", "rice", "spring onion|spring onions", "soy sauce"));

    public List<ScoredMeal> findUsefulMeals(
            List<Food> foodsFromYou,
            List<Food> foodsFromThem,
            Set<String> selectedCultures,
            int limit) {
        if (foodsFromYou.isEmpty() || foodsFromThem.isEmpty()) {
            return List.of();
        }

        return TEMPLATES.stream()
                .map(template -> score(template, foodsFromYou, foodsFromThem, selectedCultures))
                .filter(scored -> scored != null)
                .sorted(Comparator.comparingInt(ScoredMeal::score).reversed()
                        .thenComparing(scored -> scored.template().name()))
                .limit(Math.max(1, limit))
                .toList();
    }

    private ScoredMeal score(
            MealTemplate template,
            List<Food> foodsFromYou,
            List<Food> foodsFromThem,
            Set<String> selectedCultures) {
        LinkedHashSet<Food> fromYou = new LinkedHashSet<>();
        LinkedHashSet<Food> fromThem = new LinkedHashSet<>();
        List<String> missing = new ArrayList<>();

        for (IngredientSlot slot : template.ingredients()) {
            Food yours = findMatch(foodsFromYou, slot);
            Food theirs = findMatch(foodsFromThem, slot);
            if (yours != null && theirs != null) {
                if (fromYou.size() <= fromThem.size()) {
                    fromYou.add(yours);
                } else {
                    fromThem.add(theirs);
                }
            } else if (yours != null) {
                fromYou.add(yours);
            } else if (theirs != null) {
                fromThem.add(theirs);
            } else {
                missing.add(slot.displayName());
            }
        }

        if (fromYou.isEmpty() || fromThem.isEmpty()) {
            return null;
        }

        long importantSlots = template.ingredients().stream().filter(slot -> !isPantryStaple(slot)).count();
        long missingImportant = template.ingredients().stream()
                .filter(slot -> !isPantryStaple(slot) && missing.contains(slot.displayName()))
                .count();
        int coveredImportant = (int) (importantSlots - missingImportant);
        if (coveredImportant < 2) {
            return null;
        }

        double coverage = importantSlots == 0 ? 1 : coveredImportant / (double) importantSlots;
        if (coverage < 0.4) {
            return null;
        }

        int totalContributions = fromYou.size() + fromThem.size();
        double balance = Math.min(fromYou.size(), fromThem.size())
                / (double) Math.max(fromYou.size(), fromThem.size());
        int cultureBonus = cultureMatches(template.culture(), selectedCultures) ? 10 : 0;
        int score = Math.min(100, (int) Math.round(coverage * 65 + balance * 20
                + Math.min(5, totalContributions) + cultureBonus));
        return new ScoredMeal(template, List.copyOf(fromYou), List.copyOf(fromThem), List.copyOf(missing), score);
    }

    private Food findMatch(List<Food> foods, IngredientSlot slot) {
        return foods.stream()
                .filter(food -> slot.alternatives().stream().anyMatch(alternative -> ingredientMatches(food.getName(), alternative)))
                .findFirst()
                .orElse(null);
    }

    private boolean isPantryStaple(IngredientSlot slot) {
        return slot.alternatives().stream().map(CollaborativeMealCatalog::normalize).anyMatch(PANTRY_STAPLES::contains);
    }

    static boolean ingredientMatches(String foodName, String ingredient) {
        Set<String> foodTokens = tokenSet(foodName);
        Set<String> ingredientTokens = tokenSet(ingredient);
        return !foodTokens.isEmpty() && foodTokens.containsAll(ingredientTokens);
    }

    private static Set<String> tokenSet(String value) {
        LinkedHashSet<String> tokens = new LinkedHashSet<>();
        for (String token : normalize(value).split(" ")) {
            if (!token.isBlank()) {
                tokens.add(singular(token));
            }
        }
        return tokens;
    }

    private static String singular(String value) {
        if (value.endsWith("oes") && value.length() > 4) {
            return value.substring(0, value.length() - 2);
        }
        if (value.endsWith("ies") && value.length() > 4) {
            return value.substring(0, value.length() - 3) + "y";
        }
        if (value.endsWith("s") && !value.endsWith("ss") && value.length() > 3) {
            return value.substring(0, value.length() - 1);
        }
        return value;
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    private static boolean cultureMatches(String mealCulture, Set<String> cultures) {
        String normalizedMealCulture = normalize(mealCulture);
        return cultures != null && cultures.stream()
                .map(CollaborativeMealCatalog::normalize)
                .filter(culture -> !culture.isBlank())
                .anyMatch(culture -> normalizedMealCulture.contains(culture) || culture.contains(normalizedMealCulture));
    }

    private static MealTemplate meal(String name, String culture, String... ingredients) {
        return new MealTemplate(name, culture, List.of(ingredients).stream()
                .map(value -> {
                    List<String> alternatives = List.of(value.split("\\|"));
                    return new IngredientSlot(alternatives.getFirst(), alternatives);
                })
                .toList());
    }

    public record ScoredMeal(
            MealTemplate template,
            List<Food> foodsFromYou,
            List<Food> foodsFromThem,
            List<String> optionalMissingIngredients,
            int score) {
    }

    public record MealTemplate(String name, String culture, List<IngredientSlot> ingredients) {
    }

    public record IngredientSlot(String displayName, List<String> alternatives) {
    }
}
