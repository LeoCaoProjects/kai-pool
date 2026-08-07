package nz.ac.aut.kaipool.dto;

public record FoodContributionResponse(
        Long foodId,
        String name,
        String quantity,
        String imageUrl) {
}
