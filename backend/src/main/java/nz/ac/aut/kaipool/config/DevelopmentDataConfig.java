package nz.ac.aut.kaipool.config;

import java.util.List;
import java.util.Set;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.FoodAvailability;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.repository.FoodRepository;
import nz.ac.aut.kaipool.repository.UserRepository;

@Configuration
@Profile("dev")
public class DevelopmentDataConfig {

    @Bean
    CommandLineRunner seedDevelopmentData(
            UserRepository userRepository,
            FoodRepository foodRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            String passwordHash = passwordEncoder.encode("password123");
            User aroha = upsertDemoUser(userRepository, "Aroha Ngata", "aroha@kaipool.nz", passwordHash,
                    Set.of("Māori"), Set.of("Samoan", "Tongan"), -36.9917, 174.8615);
            User sione = upsertDemoUser(userRepository, "Sione Ma'afu", "sione@kaipool.nz", passwordHash,
                    Set.of("Tongan"), Set.of("Māori", "Indian"), -36.9892, 174.8660);
            User priya = upsertDemoUser(userRepository, "Priya Patel", "priya@kaipool.nz", passwordHash,
                    Set.of("Indian"), Set.of("Māori", "Samoan"), -36.9943, 174.8554);
            User mei = upsertDemoUser(userRepository, "Mei Chen", "mei@kaipool.nz", passwordHash,
                    Set.of("Chinese"), Set.of("Tongan", "Indian"), -36.9875, 174.8589);

            userRepository.saveAll(List.of(aroha, sione, priya, mei));
            seedFoodIfEmpty(foodRepository, aroha, List.of(
                    new Food(aroha, "Kūmara", null, "4", FoodAvailability.COOK_TOGETHER),
                    new Food(aroha, "Carrots", null, "1 bag", FoodAvailability.PRIVATE)));
            seedFoodIfEmpty(foodRepository, sione, List.of(
                    new Food(sione, "Chicken", null, "1 kg", FoodAvailability.COOK_TOGETHER),
                    new Food(sione, "Bread", null, "2 loaves", FoodAvailability.GIVEAWAY)));
            seedFoodIfEmpty(foodRepository, priya, List.of(
                    new Food(priya, "Rice", null, "2 kg", FoodAvailability.COOK_TOGETHER),
                    new Food(priya, "Tomatoes", null, "6", FoodAvailability.GIVEAWAY)));
            seedFoodIfEmpty(foodRepository, mei, List.of(
                    new Food(mei, "Eggs", null, "12", FoodAvailability.COOK_TOGETHER),
                    new Food(mei, "Spring onions", null, "2 bunches", FoodAvailability.GIVEAWAY)));
        };
    }

    private User upsertDemoUser(
            UserRepository userRepository,
            String name,
            String email,
            String passwordHash,
            Set<String> foodCultures,
            Set<String> foodCulturesToExplore,
            double latitude,
            double longitude) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> new User(name, email, passwordHash));
        user.setName(name);
        user.setPasswordHash(passwordHash);
        user.setBio("Demo account for Kai Pool development.");
        user.setLatitude(latitude);
        user.setLongitude(longitude);
        user.setFoodCultures(foodCultures);
        user.setFoodCulturesToExplore(foodCulturesToExplore);
        user.setOnboardingCompleted(true);
        return user;
    }

    private void seedFoodIfEmpty(FoodRepository foodRepository, User user, List<Food> foods) {
        if (foodRepository.findByOwnerIdOrderByCreatedAtDesc(user.getId()).isEmpty()) {
            foodRepository.saveAll(foods);
        }
    }
}
