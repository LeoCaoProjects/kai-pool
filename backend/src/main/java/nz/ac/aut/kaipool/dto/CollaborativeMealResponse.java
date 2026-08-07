package nz.ac.aut.kaipool.dto;

import java.util.List;

public record CollaborativeMealResponse(
        String mealName,
        String culturalOriginOrInspiration,
        List<String> ingredientsFromYou,
        List<String> ingredientsFromThem,
        List<String> optionalMissingIngredients,
        List<String> cookingInstructions) {
}
