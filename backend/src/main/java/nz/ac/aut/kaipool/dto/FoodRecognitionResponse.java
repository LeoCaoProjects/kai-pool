package nz.ac.aut.kaipool.dto;

import java.util.List;

public record FoodRecognitionResponse(List<DetectedFoodResponse> items) {
}
