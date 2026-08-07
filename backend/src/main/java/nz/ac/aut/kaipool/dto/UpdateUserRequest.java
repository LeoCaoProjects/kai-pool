package nz.ac.aut.kaipool.dto;

import java.util.Set;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 1000) String bio,
        String profileImageUrl,
        Double latitude,
        Double longitude,
        Set<String> foodCultures,
        Set<String> foodCulturesToExplore) {
}
