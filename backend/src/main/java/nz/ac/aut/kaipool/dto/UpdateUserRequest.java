package nz.ac.aut.kaipool.dto;

import java.util.Set;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 300) String bio,
        @Size(max = 2048) String profileImageUrl,
        @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
        @Size(max = 10) Set<@NotBlank @Size(max = 50) String> foodCultures,
        @Size(max = 10) Set<@NotBlank @Size(max = 50) String> foodCulturesToExplore,
        Boolean onboardingCompleted) {
}
