package nz.ac.aut.kaipool.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.RecipeSuggestionResponse;
import nz.ac.aut.kaipool.repository.FoodRepository;
import nz.ac.aut.kaipool.service.CultureRecipeCatalog.CultureRecipe;

@Service
public class RecipeSuggestionService {

    private final CultureRecipeCatalog catalog;
    private final FoodRepository foodRepository;
    private final UserService userService;

    public RecipeSuggestionService(
            CultureRecipeCatalog catalog, FoodRepository foodRepository, UserService userService) {
        this.catalog = catalog;
        this.foodRepository = foodRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<RecipeSuggestionResponse> suggestForCurrentUser(String email, int limit) {
        User owner = userService.getRequiredByEmail(email);
        List<String> poolItems = foodRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId()).stream()
                .map(Food::getName)
                .toList();
        return suggestForPool(poolItems, limit);
    }

    public List<RecipeSuggestionResponse> suggestForPool(List<String> poolItems, int limit) {
        if (poolItems.isEmpty()) {
            return List.of();
        }

        int cappedLimit = Math.max(1, Math.min(limit, 25));
        List<RecipeSuggestionResponse> suggestions = new ArrayList<>();

        for (CultureRecipe recipe : catalog.getRecipes()) {
            List<String> matched = new ArrayList<>();
            List<String> missing = new ArrayList<>();

            for (String ingredient : recipe.ingredients()) {
                boolean hasIngredient = poolItems.stream()
                        .anyMatch(item -> CultureRecipeCatalog.ingredientMatchesPoolItem(item, ingredient));
                if (hasIngredient) {
                    matched.add(ingredient);
                } else {
                    missing.add(ingredient);
                }
            }

            if (matched.isEmpty() || missing.isEmpty()) {
                continue;
            }

            int matchPercent = Math.round((matched.size() * 100f) / recipe.ingredients().size());
            suggestions.add(new RecipeSuggestionResponse(
                    recipe.culture(),
                    recipe.recipeName(),
                    recipe.description(),
                    List.copyOf(matched),
                    List.copyOf(missing),
                    matchPercent));
        }

        return suggestions.stream()
                .sorted(Comparator.comparingInt(RecipeSuggestionResponse::matchPercent)
                        .reversed()
                        .thenComparing(RecipeSuggestionResponse::recipeName))
                .limit(cappedLimit)
                .toList();
    }
}
