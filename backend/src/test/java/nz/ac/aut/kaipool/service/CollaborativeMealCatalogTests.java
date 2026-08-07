package nz.ac.aut.kaipool.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.FoodAvailability;
import nz.ac.aut.kaipool.domain.User;

class CollaborativeMealCatalogTests {

    private final CollaborativeMealCatalog catalog = new CollaborativeMealCatalog();

    @Test
    void ingredientMatchingHandlesPluralsAndDoesNotConfuseEggWithEggplant() {
        assertThat(CollaborativeMealCatalog.ingredientMatches("Eggs", "egg")).isTrue();
        assertThat(CollaborativeMealCatalog.ingredientMatches("Tomatoes", "tomato")).isTrue();
        assertThat(CollaborativeMealCatalog.ingredientMatches("Kūmara", "kumara")).isTrue();
        assertThat(CollaborativeMealCatalog.ingredientMatches("Eggplant", "egg")).isFalse();
    }

    @Test
    void usefulMealsRequireFoodFromBothPeople() {
        User first = new User("First", "first@example.com", "hash");
        User second = new User("Second", "second@example.com", "hash");
        List<Food> yours = List.of(new Food(first, "Chicken", null, "1 kg", FoodAvailability.COOK_TOGETHER));
        List<Food> theirs = List.of(
                new Food(second, "Rice", null, "2 cups", FoodAvailability.COOK_TOGETHER),
                new Food(second, "Eggs", null, "6", FoodAvailability.COOK_TOGETHER));

        var meals = catalog.findUsefulMeals(yours, theirs, Set.of("Chinese"), 3);

        assertThat(meals).isNotEmpty();
        assertThat(meals.getFirst().template().name()).isEqualTo("Chicken fried rice");
        assertThat(meals.getFirst().foodsFromYou()).extracting(Food::getName).containsExactly("Chicken");
        assertThat(meals.getFirst().foodsFromThem()).extracting(Food::getName).contains("Rice", "Eggs");
    }

    @Test
    void oneSidedFoodDoesNotCreateACollaborativeMeal() {
        User first = new User("First", "first@example.com", "hash");
        User second = new User("Second", "second@example.com", "hash");
        List<Food> yours = List.of(
                new Food(first, "Chicken", null, "1 kg", FoodAvailability.COOK_TOGETHER),
                new Food(first, "Rice", null, "2 cups", FoodAvailability.COOK_TOGETHER));
        List<Food> theirs = List.of(new Food(second, "Apples", null, "4", FoodAvailability.COOK_TOGETHER));

        assertThat(catalog.findUsefulMeals(yours, theirs, Set.of(), 3)).isEmpty();
    }
}
