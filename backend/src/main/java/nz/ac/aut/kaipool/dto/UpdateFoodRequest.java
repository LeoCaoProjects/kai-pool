package nz.ac.aut.kaipool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import nz.ac.aut.kaipool.domain.FoodAvailability;

public record UpdateFoodRequest(
        @NotBlank @Size(max = 150) String name,
        String imageUrl,
        @NotBlank @Size(max = 100) String quantity,
        @NotNull FoodAvailability availability) {
}
