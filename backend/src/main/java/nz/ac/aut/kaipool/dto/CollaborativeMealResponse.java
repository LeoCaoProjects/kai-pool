package nz.ac.aut.kaipool.dto;

import java.util.List;

public record CollaborativeMealResponse(
        String mealName,
        String culturalOrigin,
        List<String> ingredientsFromUserA,
        List<String> ingredientsFromUserB,
        List<String> optionalMissingIngredients,
        String cookingInstructions) {
}
