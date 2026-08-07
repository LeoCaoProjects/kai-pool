package nz.ac.aut.kaipool.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class CultureRecipeCatalog {

    private static final String CSV_PATH = "data/world_cultures_food.csv";

    private final List<CultureRecipe> recipes;

    public CultureRecipeCatalog() {
        this.recipes = loadRecipes();
    }

    public List<CultureRecipe> getRecipes() {
        return recipes;
    }

    private List<CultureRecipe> loadRecipes() {
        ClassPathResource resource = new ClassPathResource(CSV_PATH);
        if (!resource.exists()) {
            return List.of();
        }

        List<CultureRecipe> loaded = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            reader.readLine();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                List<String> fields = parseCsvLine(line);
                if (fields.size() < 4) {
                    continue;
                }
                List<String> ingredients = Arrays.stream(fields.get(3).split(","))
                        .map(String::trim)
                        .filter(part -> !part.isEmpty())
                        .toList();
                if (ingredients.isEmpty()) {
                    continue;
                }
                loaded.add(new CultureRecipe(
                        fields.get(0).trim(),
                        fields.get(1).trim(),
                        fields.get(2).trim(),
                        ingredients));
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Could not load recipe catalog from " + CSV_PATH, exception);
        }
        return List.copyOf(loaded);
    }

    static List<String> parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"') {
                inQuotes = !inQuotes;
            } else if (character == ',' && !inQuotes) {
                fields.add(stripQuotes(current.toString()));
                current.setLength(0);
            } else {
                current.append(character);
            }
        }
        fields.add(stripQuotes(current.toString()));
        return fields;
    }

    private static String stripQuotes(String value) {
        String trimmed = value.trim();
        if (trimmed.length() >= 2 && trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
            return trimmed.substring(1, trimmed.length() - 1).trim();
        }
        return trimmed;
    }

    static boolean ingredientMatchesPoolItem(String poolItem, String ingredient) {
        String normalizedPool = normalize(poolItem);
        String normalizedIngredient = normalize(ingredient);
        if (normalizedPool.isEmpty() || normalizedIngredient.isEmpty()) {
            return false;
        }
        return normalizedPool.equals(normalizedIngredient)
                || normalizedPool.contains(normalizedIngredient)
                || normalizedIngredient.contains(normalizedPool);
    }

    static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    public List<CultureRecipe> findDishesForPoolItem(String poolItem, int limit) {
        if (poolItem == null || poolItem.isBlank()) {
            return List.of();
        }
        return recipes.stream()
                .filter(recipe -> recipe.ingredients().stream()
                        .anyMatch(ingredient -> ingredientMatchesPoolItem(poolItem, ingredient)))
                .limit(Math.max(1, limit))
                .toList();
    }

    public List<ScoredCollaboration> scoreCollaborativeRecipes(
            List<String> poolA,
            List<String> poolB,
            Set<String> culturesA,
            Set<String> culturesB,
            int limit) {
        if (poolA.isEmpty() || poolB.isEmpty()) {
            return List.of();
        }

        List<ScoredCollaboration> scored = new ArrayList<>();
        for (CultureRecipe recipe : recipes) {
            ScoredCollaboration collaboration = scoreRecipe(recipe, poolA, poolB, culturesA, culturesB);
            if (collaboration != null) {
                scored.add(collaboration);
            }
        }

        return scored.stream()
                .sorted(Comparator.comparingInt(ScoredCollaboration::matchScore).reversed()
                        .thenComparing(scoredRecipe -> scoredRecipe.recipe().recipeName()))
                .limit(Math.max(1, limit))
                .toList();
    }

    private ScoredCollaboration scoreRecipe(
            CultureRecipe recipe,
            List<String> poolA,
            List<String> poolB,
            Set<String> culturesA,
            Set<String> culturesB) {
        Set<String> fromA = new LinkedHashSet<>();
        Set<String> fromB = new LinkedHashSet<>();
        List<String> missing = new ArrayList<>();

        for (String ingredient : recipe.ingredients()) {
            String matchA = findMatchingPoolItem(poolA, ingredient);
            String matchB = findMatchingPoolItem(poolB, ingredient);
            if (matchA != null && matchB == null) {
                fromA.add(matchA);
            } else if (matchB != null && matchA == null) {
                fromB.add(matchB);
            } else if (matchA != null) {
                fromA.add(matchA);
            } else if (matchB != null) {
                fromB.add(matchB);
            } else {
                missing.add(ingredient);
            }
        }

        if (fromA.isEmpty() || fromB.isEmpty()) {
            return null;
        }

        List<String> optionalMissing = new ArrayList<>(missing);
        int requiredIngredients = 0;
        int matchedRequired = 0;
        for (String ingredient : recipe.ingredients()) {
            if (isPantryStaple(ingredient)) {
                continue;
            }
            requiredIngredients++;
            boolean covered = !missing.contains(ingredient);
            if (covered) {
                matchedRequired++;
            }
        }

        if (requiredIngredients == 0) {
            requiredIngredients = recipe.ingredients().size();
            matchedRequired = recipe.ingredients().size() - missing.size();
        }

        float coverage = matchedRequired / (float) requiredIngredients;
        if (coverage < 0.45f) {
            return null;
        }

        int cultureBoost = culturePreferenceBoost(recipe.culture(), culturesA, culturesB);
        int matchScore = Math.round(coverage * 100) + cultureBoost;
        return new ScoredCollaboration(
                recipe,
                List.copyOf(fromA),
                List.copyOf(fromB),
                List.copyOf(optionalMissing),
                matchScore,
                Math.round(coverage * 100));
    }

    static String findMatchingPoolItem(List<String> poolItems, String ingredient) {
        for (String poolItem : poolItems) {
            if (ingredientMatchesPoolItem(poolItem, ingredient)) {
                return poolItem;
            }
        }
        return null;
    }

    static boolean isPantryStaple(String ingredient) {
        String normalized = normalize(ingredient);
        if (normalized.isEmpty()) {
            return false;
        }
        return normalized.equals("salt")
                || normalized.equals("oil")
                || normalized.equals("water")
                || normalized.equals("pepper")
                || normalized.equals("sugar")
                || normalized.contains("soy sauce")
                || normalized.contains("broth");
    }

    static int culturePreferenceBoost(String recipeCulture, Set<String> culturesA, Set<String> culturesB) {
        int boost = 0;
        boost += cultureMatches(recipeCulture, culturesA) ? 8 : 0;
        boost += cultureMatches(recipeCulture, culturesB) ? 8 : 0;
        boost += cultureMatches(recipeCulture, culturesA) && cultureMatches(recipeCulture, culturesB) ? 4 : 0;
        return boost;
    }

    static boolean cultureMatches(String recipeCulture, Set<String> userCultures) {
        if (userCultures == null || userCultures.isEmpty()) {
            return false;
        }
        String normalizedRecipe = normalize(recipeCulture);
        for (String culture : userCultures) {
            String normalizedCulture = normalize(culture);
            if (normalizedRecipe.contains(normalizedCulture) || normalizedCulture.contains(normalizedRecipe)) {
                return true;
            }
            if (normalizedCulture.equals("maori") && normalizedRecipe.equals("maori")) {
                return true;
            }
        }
        return false;
    }

    public record ScoredCollaboration(
            CultureRecipe recipe,
            List<String> ingredientsFromUserA,
            List<String> ingredientsFromUserB,
            List<String> optionalMissingIngredients,
            int matchScore,
            int coveragePercent) {
    }

    record CultureRecipe(String culture, String recipeName, String description, List<String> ingredients) {
    }
}
