package nz.ac.aut.kaipool.config;

import java.util.List;
import java.util.Set;

import nz.ac.aut.kaipool.domain.FoodAvailability;

final class DevelopmentSeedData {

    private DevelopmentSeedData() {
    }

    static List<TestUserSeed> testUsers() {
        return List.of(
                user(1, "Auckland", -36.8509, 174.7645, "Chinese", "Māori",
                        food("Chicken", "1 kg"), food("Carrots", "5"), food("Spring onions", "2 bunches"), privateFood("Milk", "1 litre")),
                user(2, "Auckland", -36.8620, 174.7530, "Italian", "Chinese",
                        food("Rice", "2 cups"), food("Eggs", "8"), food("Tomatoes", "6"), giveaway("Apples", "4")),
                user(3, "Auckland", -36.8410, 174.7810, "Māori", "Samoan",
                        food("Kūmara", "4"), food("Onions", "3"), food("Carrots", "1 bag"), privateFood("Yoghurt", "500 g")),
                user(4, "Auckland", -36.8750, 174.7700, "Indian", "Italian",
                        food("Chicken", "750 g"), food("Rice", "1 kg"), food("Tomatoes", "4"), giveaway("Bread", "1 loaf")),
                user(5, "Auckland", -36.8350, 174.7450, "Italian", "Mediterranean",
                        food("Pasta", "500 g"), food("Tomatoes", "5"), food("Cheese", "250 g"), privateFood("Bananas", "6")),
                user(6, "Auckland", -36.8900, 174.7600, "Mexican", "Indian",
                        food("Beans", "2 cans"), food("Tomatoes", "4"), food("Onions", "2"), giveaway("Limes", "3")),
                user(7, "Auckland", -36.8450, 174.8050, "Korean", "Chinese",
                        food("Noodles", "400 g"), food("Chicken", "500 g"), food("Cabbage", "1"), privateFood("Butter", "200 g")),
                user(8, "Auckland", -36.9050, 174.7850, "Samoan", "Māori",
                        food("Potatoes", "1 kg"), food("Eggs", "6"), food("Onions", "4"), giveaway("Oranges", "5")),
                user(9, "Auckland", -36.8200, 174.7750, "Japanese", "Chinese",
                        food("Rice", "3 cups"), food("Chicken", "600 g"), food("Spring onions", "1 bunch"), privateFood("Tofu", "300 g")),
                user(10, "Auckland", -36.8800, 174.8150, "Mediterranean", "Italian",
                        food("Capsicum", "3"), food("Carrots", "6"), food("Rice", "2 cups"), giveaway("Cucumber", "2")),
                user(11, "Auckland", -36.8300, 174.7200, "Chinese", "Korean",
                        food("Broccoli", "2 heads"), food("Noodles", "500 g"), food("Eggs", "10"), privateFood("Cheese", "200 g")),
                user(12, "Auckland", -36.9150, 174.7400, "Māori", "Tongan",
                        food("Cabbage", "1"), food("Potatoes", "1.5 kg"), food("Carrots", "1 bag"), giveaway("Bread", "1 loaf")),

                user(13, "Hamilton", -37.7870, 175.2793, "Indian", "Chinese",
                        food("Chicken", "1 kg"), food("Rice", "2 cups"), food("Onions", "3"), privateFood("Milk", "2 litres")),
                user(14, "Hamilton", -37.7750, 175.2950, "Chinese", "Italian",
                        food("Eggs", "12"), food("Carrots", "5"), food("Spring onions", "2 bunches"), giveaway("Pears", "5")),
                user(15, "Hamilton", -37.8050, 175.2600, "Italian", "Māori",
                        food("Kūmara", "5"), food("Tomatoes", "6"), food("Cheese", "300 g"), privateFood("Spinach", "1 bag")),

                user(16, "Wellington", -41.2866, 174.7756, "Italian", "Chinese",
                        food("Pasta", "500 g"), food("Tomatoes", "5"), food("Onions", "3"), privateFood("Milk", "1 litre")),
                user(17, "Wellington", -41.3000, 174.7900, "Chinese", "Japanese",
                        food("Chicken", "700 g"), food("Rice", "3 cups"), food("Eggs", "8"), giveaway("Mandarins", "6")),
                user(18, "Wellington", -41.2700, 174.7600, "Māori", "Samoan",
                        food("Kūmara", "4"), food("Carrots", "6"), food("Cabbage", "1"), privateFood("Butter", "250 g")),
                user(19, "Wellington", -41.3150, 174.7700, "Indian", "Mediterranean",
                        food("Chicken", "1 kg"), food("Tomatoes", "4"), food("Potatoes", "1 kg"), giveaway("Bread", "1 loaf")),
                user(20, "Wellington", -41.2800, 174.8100, "Mediterranean", "Italian",
                        food("Eggs", "10"), food("Capsicum", "3"), food("Onions", "4"), privateFood("Feta", "200 g")),
                user(21, "Wellington", -41.3250, 174.8000, "Korean", "Chinese",
                        food("Noodles", "400 g"), food("Broccoli", "2 heads"), food("Chicken", "500 g"), giveaway("Apples", "5")),

                user(22, "Christchurch", -43.5321, 172.6362, "Māori", "Italian",
                        food("Kūmara", "5"), food("Eggs", "8"), food("Spring onions", "1 bunch"), privateFood("Milk", "1 litre")),
                user(23, "Christchurch", -43.5200, 172.6500, "Chinese", "Korean",
                        food("Rice", "3 cups"), food("Chicken", "750 g"), food("Carrots", "5"), giveaway("Pears", "4")),
                user(24, "Christchurch", -43.5450, 172.6200, "Italian", "Mediterranean",
                        food("Pasta", "500 g"), food("Tomatoes", "6"), food("Cheese", "250 g"), privateFood("Yoghurt", "500 g")),
                user(25, "Christchurch", -43.5100, 172.6100, "Indian", "Chinese",
                        food("Chicken", "1 kg"), food("Potatoes", "1 kg"), food("Onions", "3"), giveaway("Bread", "1 loaf")),
                user(26, "Christchurch", -43.5550, 172.6650, "Samoan", "Māori",
                        food("Cabbage", "1"), food("Carrots", "1 bag"), food("Kūmara", "4"), privateFood("Butter", "200 g")),
                user(27, "Christchurch", -43.5250, 172.6800, "Japanese", "Chinese",
                        food("Noodles", "450 g"), food("Eggs", "10"), food("Broccoli", "2 heads"), giveaway("Oranges", "5")),

                user(28, "Dunedin", -45.8788, 170.5028, "Italian", "Chinese",
                        food("Tomatoes", "5"), food("Eggs", "8"), food("Bread", "1 loaf"), privateFood("Milk", "1 litre")),
                user(29, "Dunedin", -45.8650, 170.5150, "Chinese", "Indian",
                        food("Chicken", "700 g"), food("Rice", "2 cups"), food("Spring onions", "2 bunches"), giveaway("Apples", "5")),
                user(30, "Dunedin", -45.8950, 170.4850, "Māori", "Mediterranean",
                        food("Kūmara", "5"), food("Carrots", "6"), food("Onions", "3"), privateFood("Cheese", "200 g")));
    }

    private static TestUserSeed user(
            int number,
            String city,
            double latitude,
            double longitude,
            String foodCulture,
            String cultureToExplore,
            TestFoodSeed... foods) {
        String id = "%02d".formatted(number);
        return new TestUserSeed(
                "Test Cook " + id,
                "test" + id + "@kaipool.nz",
                "Development-only cook based in " + city + ".",
                latitude,
                longitude,
                Set.of(foodCulture),
                Set.of(cultureToExplore),
                List.of(foods));
    }

    private static TestFoodSeed food(String name, String quantity) {
        return new TestFoodSeed(name, quantity, FoodAvailability.COOK_TOGETHER);
    }

    private static TestFoodSeed privateFood(String name, String quantity) {
        return new TestFoodSeed(name, quantity, FoodAvailability.PRIVATE);
    }

    private static TestFoodSeed giveaway(String name, String quantity) {
        return new TestFoodSeed(name, quantity, FoodAvailability.GIVEAWAY);
    }

    record TestUserSeed(
            String name,
            String email,
            String bio,
            double latitude,
            double longitude,
            Set<String> foodCultures,
            Set<String> foodCulturesToExplore,
            List<TestFoodSeed> foods) {
    }

    record TestFoodSeed(String name, String quantity, FoodAvailability availability) {
    }
}
