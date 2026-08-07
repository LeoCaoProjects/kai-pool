package nz.ac.aut.kaipool.dto;

public record DetectedFoodResponse(
        String name,
        String quantity,
        Double confidence) {
}
