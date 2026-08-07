package nz.ac.aut.kaipool.dto;

import java.util.List;

public record RecipeSuggestionResponse(
        String culture,
        String recipeName,
        String description,
        List<String> matchedIngredients,
        List<String> missingIngredients,
        int matchPercent) {
}
