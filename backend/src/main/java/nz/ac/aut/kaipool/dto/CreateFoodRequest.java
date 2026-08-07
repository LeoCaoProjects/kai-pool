package nz.ac.aut.kaipool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import nz.ac.aut.kaipool.domain.FoodAvailability;

public record CreateFoodRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 2048) String imageUrl,
        @Size(max = 100) String quantity,
        @NotNull FoodAvailability availability) {
}
