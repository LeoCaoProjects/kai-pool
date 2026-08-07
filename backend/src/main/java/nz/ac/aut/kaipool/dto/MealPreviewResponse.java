package nz.ac.aut.kaipool.dto;

import java.util.List;

public record MealPreviewResponse(
        String mealName,
        String culturalOrigin,
        List<String> ingredientsFromYou,
        List<String> ingredientsFromThem,
        List<String> optionalMissingIngredients) {
}
