package nz.ac.aut.kaipool.dto;

import java.util.List;

public record DishFromIngredientResponse(
        String poolIngredient,
        List<DishSummary> suggestedDishes) {

    public record DishSummary(
            String culture,
            String dishName,
            String description,
            List<String> ingredients) {
    }
}
