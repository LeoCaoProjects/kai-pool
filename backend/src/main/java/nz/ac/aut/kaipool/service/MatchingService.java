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
import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.dto.FoodContributionResponse;
import nz.ac.aut.kaipool.dto.MealPreviewResponse;
import nz.ac.aut.kaipool.exception.ResourceNotFoundException;
import nz.ac.aut.kaipool.repository.FoodRepository;
import nz.ac.aut.kaipool.repository.CookingConnectionRepository;
import nz.ac.aut.kaipool.repository.UserRepository;
import nz.ac.aut.kaipool.service.CollaborativeMealCatalog.ScoredMeal;
import nz.ac.aut.kaipool.service.MatchMealSuggestionService.SuggestionRequest;
import nz.ac.aut.kaipool.util.GeoUtils;

@Service
public class MatchingService {

    private final CollaborativeMealCatalog mealCatalog;
    private final FoodRepository foodRepository;
    private final CookingConnectionRepository connectionRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final MatchMealSuggestionService mealSuggestionService;
    private final double maxDistanceKm;

    public MatchingService(
            CollaborativeMealCatalog mealCatalog,
            FoodRepository foodRepository,
            CookingConnectionRepository connectionRepository,
            UserRepository userRepository,
            UserService userService,
            MatchMealSuggestionService mealSuggestionService,
            @Value("${app.matching.max-distance-km:30}") double maxDistanceKm) {
        this.mealCatalog = mealCatalog;
        this.foodRepository = foodRepository;
        this.connectionRepository = connectionRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.mealSuggestionService = mealSuggestionService;
        this.maxDistanceKm = Math.max(1, maxDistanceKm);
    }

    @Transactional(readOnly = true)
    public List<CookingMatchResponse> findMatches(String email) {
        User viewer = userService.getRequiredByEmail(email);
        Set<Long> unavailableUserIds = connectionRepository.findAllForUser(viewer.getId()).stream()
                .filter(connection -> connection.getStatus() != nz.ac.aut.kaipool.domain.CookingConnectionStatus.DECLINED)
                .map(connection -> connection.getRequester().getId().equals(viewer.getId())
                        ? connection.getRecipient().getId()
                        : connection.getRequester().getId())
                .collect(Collectors.toSet());
        return findMatchContexts(email, unavailableUserIds, 10).stream()
                .map(MatchContext::response)
                .toList();
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

    @Transactional(readOnly = true)
    public User getRequiredEligibleUser(String email, Long matchedUserId) {
        User currentUser = userService.getRequiredByEmail(email);
        User candidate = userRepository.findById(matchedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Cooking match not found"));
        if (currentUser.getId().equals(candidate.getId()) || !hasLocation(currentUser) || !hasLocation(candidate)) {
            throw new ResourceNotFoundException("Cooking match not found");
        }
        double distance = GeoUtils.distanceKm(
                currentUser.getLatitude(), currentUser.getLongitude(),
                candidate.getLatitude(), candidate.getLongitude());
        if (distance > maxDistanceKm) {
            throw new ResourceNotFoundException("Cooking match not found");
        }
        List<Food> currentFoods = foodRepository.findByOwnerIdAndAvailabilityOrderByCreatedAtDesc(
                currentUser.getId(), FoodAvailability.COOK_TOGETHER);
        List<Food> candidateFoods = foodRepository.findByOwnerIdAndAvailabilityOrderByCreatedAtDesc(
                candidate.getId(), FoodAvailability.COOK_TOGETHER);
        if (currentFoods.isEmpty() || candidateFoods.isEmpty()
                || mealCatalog.findUsefulMeals(
                        currentFoods, candidateFoods, selectedCultures(currentUser, candidate), 1).isEmpty()) {
            throw new ResourceNotFoundException("Cooking match not found");
        }
        return candidate;
    }

    private List<MatchContext> findMatchContexts(String email) {
        return findMatchContexts(email, Set.of(), Integer.MAX_VALUE);
    }

    private List<MatchContext> findMatchContexts(String email, Set<Long> excludedUserIds, int limit) {
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

        List<NearbyCandidate> nearbyCandidates = new ArrayList<>();
        for (User candidate : userRepository.findAllWithCultures()) {
            if (candidate.getId().equals(currentUser.getId())
                    || excludedUserIds.contains(candidate.getId()) || !hasLocation(candidate)) {
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

            nearbyCandidates.add(new NearbyCandidate(candidate, candidateFoods, distance));
        }

        List<PreparedCandidate> prepared = new ArrayList<>();
        for (NearbyCandidate nearby : nearbyCandidates) {
            User candidate = nearby.user();
            List<Food> candidateFoods = nearby.foods();
            double distance = nearby.distance();

            Set<String> selectedCultures = selectedCultures(currentUser, candidate);
            List<ScoredMeal> usefulMeals = mealCatalog.findUsefulMeals(
                    currentFoods, candidateFoods, selectedCultures, 6);
            if (usefulMeals.isEmpty()) {
                continue;
            }

            prepared.add(new PreparedCandidate(candidate, candidateFoods, distance, usefulMeals));
        }

        // Rank and cap candidates before the expensive Gemini/Pexels stage. This
        // keeps Discover to one small batch even when many users are nearby.
        prepared = prepared.stream()
                .sorted(Comparator
                        .comparingDouble((PreparedCandidate item) -> item.usefulMeals().getFirst().score()).reversed()
                        .thenComparingDouble(PreparedCandidate::distance)
                        .thenComparing(item -> item.user().getName()))
                .limit(limit)
                .toList();

        Map<Long, CollaborativeMealResponse> suggestions = mealSuggestionService.suggest(prepared.stream()
                .map(item -> new SuggestionRequest(currentUser.getId(), item.user().getId(), currentFoods, item.foods(),
                        selectedCultures(currentUser, currentUser), selectedCultures(item.user(), item.user()),
                        item.usefulMeals().getFirst()))
                .toList());
        List<MatchContext> matches = prepared.stream().map(item -> {
            CollaborativeMealResponse meal = suggestions.get(item.user().getId());
            CookingMatchResponse response = toResponse(
                    item.user(), currentFoods, item.foods(), item.usefulMeals(), meal, item.distance());
            return new MatchContext(currentUser, item.user(), currentFoods, item.foods(), item.usefulMeals(), response);
        }).filter(context -> !context.response().yourContributions().isEmpty()
                && !context.response().theirContributions().isEmpty()).toList();

        List<MatchContext> result = matches.stream()
                .sorted(Comparator.comparingInt((MatchContext context) -> context.response().matchScore()).reversed()
                        .thenComparingDouble(context -> context.response().distanceKm())
                        .thenComparing(context -> context.response().matchedUserName()))
                .toList();
        return result;
    }

    private CookingMatchResponse toResponse(
            User candidate,
            List<Food> currentFoods,
            List<Food> candidateFoods,
            List<ScoredMeal> meals,
            CollaborativeMealResponse generated,
            double distance) {
        ScoredMeal bestMeal = meals.getFirst();
        double proximity = Math.max(0, 1 - distance / maxDistanceKm);
        int score = Math.min(100, (int) Math.round(bestMeal.score() * 0.8 + proximity * 15
                + Math.min(5, meals.size() * 2)));

        Map<String, Food> yours = new LinkedHashMap<>();
        Map<String, Food> theirs = new LinkedHashMap<>();
        meals.forEach(meal -> {
            meal.foodsFromYou().forEach(food -> yours.putIfAbsent(normalizeFoodName(food.getName()), food));
            meal.foodsFromThem().forEach(food -> theirs.putIfAbsent(normalizeFoodName(food.getName()), food));
        });

        List<Food> generatedYours = foodsNamed(generated.ingredientsFromYou(), currentFoods);
        List<Food> generatedTheirs = foodsNamed(generated.ingredientsFromThem(), candidateFoods);
        String yourNames = joinNames(generatedYours);
        String theirNames = joinNames(generatedTheirs);
        String reason = "Your " + yourNames + " complement " + candidate.getName() + "'s " + theirNames
                + " for " + generated.mealName() + ".";

        return new CookingMatchResponse(
                candidate.getId(),
                candidate.getName(),
                candidate.getBio(),
                candidate.getProfileImageUrl(),
                Set.copyOf(candidate.getFoodCultures()),
                roundDistance(distance),
                score,
                reason,
                generatedYours.stream().map(MatchingService::toContribution).toList(),
                generatedTheirs.stream().map(MatchingService::toContribution).toList(),
                List.of(toPreview(generated)));
    }

    private static List<Food> foodsNamed(List<String> names, List<Food> foods) {
        if (names == null) return List.of();
        return foods.stream().filter(food -> names.stream().anyMatch(name ->
                CollaborativeMealCatalog.ingredientMatches(name, food.getName())
                        || CollaborativeMealCatalog.ingredientMatches(food.getName(), name))).toList();
    }

    private MealPreviewResponse toPreview(CollaborativeMealResponse meal) {
        return new MealPreviewResponse(meal.mealName(), meal.description(), meal.culturalOriginOrInspiration(),
                meal.ingredientsFromYou(), meal.ingredientsFromThem(), meal.optionalMissingIngredients(),
                meal.imageUrl(), meal.imageSource(), meal.imageAttribution());
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


    private static String joinNames(List<Food> foods) {
        return foods.stream().map(Food::getName).limit(2).reduce((first, second) -> first + " and " + second).orElse("food");
    }


    private static String normalizeFoodName(String name) {
        return name == null ? "" : name.trim().toLowerCase();
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

    private record NearbyCandidate(User user, List<Food> foods, double distance) {
    }

    private record PreparedCandidate(
            User user, List<Food> foods, double distance, List<ScoredMeal> usefulMeals) {
    }

}
