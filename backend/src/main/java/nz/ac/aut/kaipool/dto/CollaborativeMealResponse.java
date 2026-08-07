package nz.ac.aut.kaipool.dto;

import java.util.List;

public record CollaborativeMealResponse(
        String mealName,
        String description,
        String culturalOriginOrInspiration,
        List<String> ingredientsFromYou,
        List<String> ingredientsFromThem,
        List<String> optionalMissingIngredients,
        List<String> cookingInstructions,
        String imageUrl,
        String imageSource,
        String imageAttribution) {
}
