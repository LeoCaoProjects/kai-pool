package nz.ac.aut.kaipool.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.FoodAvailability;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.service.CollaborativeMealCatalog.IngredientSlot;
import nz.ac.aut.kaipool.service.CollaborativeMealCatalog.MealTemplate;
import nz.ac.aut.kaipool.service.CollaborativeMealCatalog.ScoredMeal;
import nz.ac.aut.kaipool.service.CollaborativeRecipeGenerator.RecipeGenerationRequest;
import nz.ac.aut.kaipool.service.MatchingService.MatchContext;

class CollaborativeRecipeServiceTests {

    @Test
    void sendsBothPoolsAndSelectedCulturesToGenerator() {
        MatchingService matchingService = mock(MatchingService.class);
        CollaborativeRecipeCache cache = emptyCache();
        RecipeGenerationRequest[] captured = new RecipeGenerationRequest[1];
        CollaborativeRecipeGenerator generator = request -> {
            captured[0] = request;
            return List.of(validGeneratedMeal());
        };
        MatchContext context = matchContext();
        when(matchingService.getRequiredMatch("chef@example.com", 2L)).thenReturn(context);

        var service = service(matchingService, generator, cache);
        List<CollaborativeMealResponse> meals = service.generateForMatch("chef@example.com", 2L);

        assertThat(captured[0].currentUserIngredients()).containsExactly("Chicken");
        assertThat(captured[0].matchedUserIngredients()).containsExactly("Rice", "Eggs");
        assertThat(captured[0].currentUserCultures()).contains("Chinese", "Indian");
        assertThat(captured[0].matchedUserCultures()).contains("Italian", "Chinese");
        assertThat(meals).hasSize(3);
        assertThat(meals.getFirst().ingredientsFromYou()).containsExactly("Chicken");
        assertThat(meals.getFirst().ingredientsFromThem()).containsExactly("Rice", "Eggs");
    }

    @Test
    void rejectsInventedAiContributionsAndFallsBackToOwnedFood() {
        MatchingService matchingService = mock(MatchingService.class);
        CollaborativeRecipeCache cache = emptyCache();
        CollaborativeRecipeGenerator generator = request -> List.of(new CollaborativeMealResponse(
                "Invented feast",
                "An invented meal.",
                "AI",
                List.of("Dragon fruit"),
                List.of("Moon cheese"),
                List.of(),
                List.of("Serve."),
                null,
                null,
                null));
        when(matchingService.getRequiredMatch("chef@example.com", 2L)).thenReturn(matchContext());

        var service = service(matchingService, generator, cache);
        List<CollaborativeMealResponse> meals = service.generateForMatch("chef@example.com", 2L);

        assertThat(meals).hasSize(3);
        assertThat(meals).allSatisfy(meal -> {
            assertThat(meal.ingredientsFromYou()).allMatch(value -> value.equals("Chicken"));
            assertThat(meal.ingredientsFromThem()).allMatch(value -> value.equals("Rice") || value.equals("Eggs"));
        });
        assertThat(meals).extracting(CollaborativeMealResponse::mealName).doesNotContain("Invented feast");
    }

    @Test
    void cachedRecipesDoNotCallGeneratorAgain() {
        MatchingService matchingService = mock(MatchingService.class);
        CollaborativeRecipeGenerator generator = mock(CollaborativeRecipeGenerator.class);
        CollaborativeRecipeCache cache = mock(CollaborativeRecipeCache.class);
        MatchContext context = matchContext();
        when(matchingService.getRequiredMatch("chef@example.com", 2L)).thenReturn(context);
        when(cache.get(org.mockito.ArgumentMatchers.any())).thenReturn(Optional.of(List.of(validGeneratedMeal())));

        var service = service(matchingService, generator, cache);
        List<CollaborativeMealResponse> meals = service.generateForMatch("chef@example.com", 2L);

        assertThat(meals).hasSize(1);
        verify(generator, never()).generate(org.mockito.ArgumentMatchers.any());
        verify(cache, never()).put(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    private CollaborativeRecipeCache emptyCache() {
        CollaborativeRecipeCache cache = mock(CollaborativeRecipeCache.class);
        when(cache.get(org.mockito.ArgumentMatchers.any())).thenReturn(Optional.empty());
        return cache;
    }

    private CollaborativeRecipeService service(
            MatchingService matchingService,
            CollaborativeRecipeGenerator generator,
            CollaborativeRecipeCache cache) {
        MealVisualService visualService = mock(MealVisualService.class);
        when(visualService.addImages(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        return new CollaborativeRecipeService(matchingService, generator, cache, visualService);
    }

    private MatchContext matchContext() {
        User current = new User("Chef", "chef@example.com", "hash");
        current.setFoodCultures(Set.of("Chinese"));
        current.setFoodCulturesToExplore(Set.of("Indian"));
        User friend = new User("Friend", "friend@example.com", "hash");
        friend.setFoodCultures(Set.of("Italian"));
        friend.setFoodCulturesToExplore(Set.of("Chinese"));
        Food chicken = new Food(current, "Chicken", null, "1 kg", FoodAvailability.COOK_TOGETHER);
        Food rice = new Food(friend, "Rice", null, "2 cups", FoodAvailability.COOK_TOGETHER);
        Food eggs = new Food(friend, "Eggs", null, "6", FoodAvailability.COOK_TOGETHER);
        MealTemplate template = new MealTemplate(
                "Chicken fried rice",
                "Chinese-inspired",
                List.of(new IngredientSlot("chicken", List.of("chicken"))));
        ScoredMeal scored = new ScoredMeal(template, List.of(chicken), List.of(rice, eggs), List.of("soy sauce"), 80);
        return new MatchContext(current, friend, List.of(chicken), List.of(rice, eggs), List.of(scored), null);
    }

    private CollaborativeMealResponse validGeneratedMeal() {
        return new CollaborativeMealResponse(
                "Chicken and egg rice",
                "A savoury shared rice dish.",
                "Chinese-inspired",
                List.of("Chicken"),
                List.of("Rice", "Eggs"),
                List.of("Spring onion"),
                List.of("Prepare ingredients.", "Cook thoroughly.", "Combine and serve."),
                "https://example.com/meal.jpg",
                "Test",
                "Test photo");
    }
}
