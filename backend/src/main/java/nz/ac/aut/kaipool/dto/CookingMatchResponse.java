package nz.ac.aut.kaipool.dto;

import java.util.List;
import java.util.Set;

public record CookingMatchResponse(
        Long matchedUserId,
        String matchedUserName,
        String matchedUserBio,
        String matchedUserProfileImageUrl,
        Set<String> matchedUserFoodCultures,
        double distanceKm,
        int matchScore,
        String matchReason,
        List<FoodContributionResponse> yourContributions,
        List<FoodContributionResponse> theirContributions,
        List<MealPreviewResponse> possibleMeals) {
}
