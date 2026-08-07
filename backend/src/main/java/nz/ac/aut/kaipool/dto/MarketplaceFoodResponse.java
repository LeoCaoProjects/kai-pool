package nz.ac.aut.kaipool.dto;

import java.time.Instant;

import nz.ac.aut.kaipool.domain.FoodAvailability;

/** A food listing with only the owner information needed to place it on the map. */
public record MarketplaceFoodResponse(
        Long id,
        String name,
        String imageUrl,
        String quantity,
        FoodAvailability availability,
        Instant createdAt,
        Long ownerId,
        String ownerName,
        Double distanceKm,
        Instant claimedAt) {
}
