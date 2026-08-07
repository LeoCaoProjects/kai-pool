package nz.ac.aut.kaipool.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.FoodAvailability;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.CookingMatchResponse;
import nz.ac.aut.kaipool.dto.FoodContributionResponse;
import nz.ac.aut.kaipool.dto.MealPreviewResponse;
import nz.ac.aut.kaipool.exception.ResourceNotFoundException;
import nz.ac.aut.kaipool.repository.FoodRepository;
import nz.ac.aut.kaipool.repository.UserRepository;
import nz.ac.aut.kaipool.service.CollaborativeMealCatalog.ScoredMeal;
import nz.ac.aut.kaipool.service.MealVisualCatalog.MealVisual;
import nz.ac.aut.kaipool.util.GeoUtils;

@Service
public class MatchingService {

    private final CollaborativeMealCatalog mealCatalog;
    private final FoodRepository foodRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final MealVisualCatalog mealVisualCatalog;
    private final double maxDistanceKm;

    public MatchingService(
            CollaborativeMealCatalog mealCatalog,
            FoodRepository foodRepository,
            UserRepository userRepository,
            UserService userService,
            MealVisualCatalog mealVisualCatalog,
            @Value("${app.matching.max-distance-km:30}") double maxDistanceKm) {
        this.mealCatalog = mealCatalog;
        this.foodRepository = foodRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.mealVisualCatalog = mealVisualCatalog;
        this.maxDistanceKm = Math.max(1, maxDistanceKm);
    }

    @Transactional(readOnly = true)
    public List<CookingMatchResponse> findMatches(String email) {
        return findMatchContexts(email).stream().map(MatchContext::response).toList();
    }

    @Transactional(readOnly = true)
    public MatchContext getRequiredMatch(String email, Long matchedUserId) {
        return findMatchContexts(email).stream()
                .filter(context -> context.otherUser().getId().equals(matchedUserId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cooking match not found"));
    }

    @Transactional(readOnly = true)
    public CookingMatchResponse getMatch(String email, Long matchedUserId) {
        return getRequiredMatch(email, matchedUserId).response();
    }

    private List<MatchContext> findMatchContexts(String email) {
        User currentUser = userService.getRequiredByEmail(email);
        if (!hasLocation(currentUser)) {
            return List.of();
        }

        Map<Long, List<Food>> foodsByOwner = foodRepository
                .findByAvailabilityOrderByCreatedAtDesc(FoodAvailability.COOK_TOGETHER)
                .stream()
                .collect(Collectors.groupingBy(food -> food.getOwner().getId()));
        List<Food> currentFoods = foodsByOwner.getOrDefault(currentUser.getId(), List.of());
        if (currentFoods.isEmpty()) {
            return List.of();
        }

        List<MatchContext> matches = new ArrayList<>();
        for (User candidate : userRepository.findAllWithCultures()) {
            if (candidate.getId().equals(currentUser.getId()) || !hasLocation(candidate)) {
                continue;
            }
            double distance = GeoUtils.distanceKm(
                    currentUser.getLatitude(), currentUser.getLongitude(),
                    candidate.getLatitude(), candidate.getLongitude());
            if (distance > maxDistanceKm) {
                continue;
            }

            List<Food> candidateFoods = foodsByOwner.getOrDefault(candidate.getId(), List.of());
            if (candidateFoods.isEmpty()) {
                continue;
            }

            Set<String> selectedCultures = selectedCultures(currentUser, candidate);
            List<ScoredMeal> usefulMeals = mealCatalog.findUsefulMeals(
                    currentFoods, candidateFoods, selectedCultures, 3);
            if (usefulMeals.isEmpty()) {
                continue;
            }

            CookingMatchResponse response = toResponse(candidate, usefulMeals, distance);
            matches.add(new MatchContext(currentUser, candidate, currentFoods, candidateFoods, usefulMeals, response));
        }

        return matches.stream()
                .sorted(Comparator.comparingInt((MatchContext context) -> context.response().matchScore()).reversed()
                        .thenComparingDouble(context -> context.response().distanceKm())
                        .thenComparing(context -> context.response().matchedUserName()))
                .limit(10)
                .toList();
    }

    private CookingMatchResponse toResponse(User candidate, List<ScoredMeal> meals, double distance) {
        ScoredMeal bestMeal = meals.getFirst();
        double proximity = Math.max(0, 1 - distance / maxDistanceKm);
        int score = Math.min(100, (int) Math.round(bestMeal.score() * 0.8 + proximity * 15
                + Math.min(5, meals.size() * 2)));

        Map<Long, Food> yours = new LinkedHashMap<>();
        Map<Long, Food> theirs = new LinkedHashMap<>();
        meals.forEach(meal -> {
            meal.foodsFromYou().forEach(food -> yours.putIfAbsent(food.getId(), food));
            meal.foodsFromThem().forEach(food -> theirs.putIfAbsent(food.getId(), food));
        });

        String yourNames = joinNames(bestMeal.foodsFromYou());
        String theirNames = joinNames(bestMeal.foodsFromThem());
        String reason = "Your " + yourNames + " complement " + candidate.getName() + "'s " + theirNames
                + " for " + bestMeal.template().name() + ".";

        return new CookingMatchResponse(
                candidate.getId(),
                candidate.getName(),
                candidate.getBio(),
                candidate.getProfileImageUrl(),
                Set.copyOf(candidate.getFoodCultures()),
                roundDistance(distance),
                score,
                reason,
                yours.values().stream().map(MatchingService::toContribution).toList(),
                theirs.values().stream().map(MatchingService::toContribution).toList(),
                meals.stream().map(this::toPreview).toList());
    }

    private static boolean hasLocation(User user) {
        return user.getLatitude() != null && user.getLongitude() != null;
    }

    private static Set<String> selectedCultures(User first, User second) {
        LinkedHashSet<String> cultures = new LinkedHashSet<>();
        cultures.addAll(first.getFoodCultures());
        cultures.addAll(first.getFoodCulturesToExplore());
        cultures.addAll(second.getFoodCultures());
        cultures.addAll(second.getFoodCulturesToExplore());
        return cultures;
    }

    private static FoodContributionResponse toContribution(Food food) {
        return new FoodContributionResponse(food.getId(), food.getName(), food.getQuantity(), food.getImageUrl());
    }

    private MealPreviewResponse toPreview(ScoredMeal meal) {
        MealVisual visual = mealVisualCatalog.forMeal(meal.template().name());
        return new MealPreviewResponse(
                meal.template().name(),
                mealVisualCatalog.descriptionFor(meal.template().name()),
                meal.template().culture(),
                meal.foodsFromYou().stream().map(Food::getName).toList(),
                meal.foodsFromThem().stream().map(Food::getName).toList(),
                meal.optionalMissingIngredients(),
                visual.imageUrl(),
                visual.source(),
                visual.attribution());
    }

    private static String joinNames(List<Food> foods) {
        return foods.stream().map(Food::getName).limit(2).reduce((first, second) -> first + " and " + second).orElse("food");
    }

    private static double roundDistance(double distance) {
        return Math.round(distance * 10.0) / 10.0;
    }

    public record MatchContext(
            User currentUser,
            User otherUser,
            List<Food> currentUserFoods,
            List<Food> otherUserFoods,
            List<ScoredMeal> usefulMeals,
            CookingMatchResponse response) {
    }
}
