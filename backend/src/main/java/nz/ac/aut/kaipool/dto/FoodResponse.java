package nz.ac.aut.kaipool.dto;

import java.time.Instant;

import nz.ac.aut.kaipool.domain.FoodAvailability;

public record FoodResponse(
        Long id,
        Long ownerId,
        String name,
        String imageUrl,
        String quantity,
        FoodAvailability availability,
        Instant createdAt) {
}
