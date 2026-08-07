package nz.ac.aut.kaipool.dto;

import java.time.Instant;
import java.util.Set;

public record UserResponse(
        Long id,
        String name,
        String email,
        String bio,
        String profileImageUrl,
        Double latitude,
        Double longitude,
        Set<String> foodCultures,
        Set<String> foodCulturesToExplore,
        boolean onboardingCompleted,
        Instant createdAt) {
}
