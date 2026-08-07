package nz.ac.aut.kaipool.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import nz.ac.aut.kaipool.domain.FoodAvailability;

class DevelopmentSeedDataTests {

    @Test
    void providesThirtyUniqueNewZealandTestCooksWithUsefulFood() {
        var users = DevelopmentSeedData.testUsers();

        assertThat(users).hasSize(30);
        assertThat(users).extracting(DevelopmentSeedData.TestUserSeed::email).doesNotHaveDuplicates();
        assertThat(users).allSatisfy(user -> {
            assertThat(user.email()).matches("test\\d{2}@kaipool\\.nz");
            assertThat(user.latitude()).isBetween(-47.5, -34.0);
            assertThat(user.longitude()).isBetween(166.0, 179.0);
            assertThat(user.foodCultures()).isNotEmpty();
            assertThat(user.foodCulturesToExplore()).isNotEmpty();
            assertThat(user.foods()).hasSize(4);
            assertThat(user.foods().stream()
                    .filter(food -> food.availability() == FoodAvailability.COOK_TOGETHER))
                    .hasSize(3);
        });
    }
}
