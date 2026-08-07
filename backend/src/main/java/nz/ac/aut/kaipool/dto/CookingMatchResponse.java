package nz.ac.aut.kaipool.dto;

import java.util.List;

public record CookingMatchResponse(
        Long matchedUserId,
        String matchedUserName,
        String matchedUserBio,
        Double distanceKm,
        int matchScore,
        String matchReason,
        List<String> yourContributions,
        List<String> theirContributions,
        List<CollaborativeMealResponse> suggestedMeals) {
}
