package nz.ac.aut.kaipool.dto;

import java.time.Instant;
import java.util.Set;

import nz.ac.aut.kaipool.domain.CookingConnectionStatus;

public record CookingConnectionResponse(
        Long id,
        CookingConnectionStatus status,
        boolean incoming,
        Long otherUserId,
        String otherUserName,
        String otherUserBio,
        String otherUserProfileImageUrl,
        Set<String> otherUserFoodCultures,
        String contactEmail,
        String meetingPlace,
        String meetingTime,
        String meetingNote,
        Instant createdAt,
        Instant respondedAt,
        Instant updatedAt) {
}
