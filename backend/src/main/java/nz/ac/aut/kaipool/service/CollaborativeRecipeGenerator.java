package nz.ac.aut.kaipool.service;

import java.util.List;
import java.util.Set;

import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;

public interface CollaborativeRecipeGenerator {

    List<CollaborativeMealResponse> generate(RecipeGenerationRequest request);

    record RecipeGenerationRequest(
            List<String> currentUserIngredients,
            List<String> matchedUserIngredients,
            Set<String> currentUserCultures,
            Set<String> matchedUserCultures) {
    }
}
