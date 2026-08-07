package nz.ac.aut.kaipool.service;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import nz.ac.aut.kaipool.ai.FoodRecognitionClient;
import nz.ac.aut.kaipool.dto.DetectedFoodResponse;
import nz.ac.aut.kaipool.dto.FoodRecognitionResponse;
import nz.ac.aut.kaipool.exception.FoodRecognitionException;
import nz.ac.aut.kaipool.exception.InvalidImageException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
public class FoodRecognitionService {

    private static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp");

    private final FoodRecognitionClient recognitionClient;
    private final ObjectMapper objectMapper;

    public FoodRecognitionService(FoodRecognitionClient recognitionClient, ObjectMapper objectMapper) {
        this.recognitionClient = recognitionClient;
        this.objectMapper = objectMapper;
    }

    public FoodRecognitionResponse recognize(MultipartFile image) {
        validate(image);

        try {
            String providerJson = recognitionClient.recognize(image.getBytes(), image.getContentType());
            FoodRecognitionResponse parsed = objectMapper.readValue(providerJson, FoodRecognitionResponse.class);
            return new FoodRecognitionResponse(cleanItems(parsed.items()));
        } catch (IOException exception) {
            throw new FoodRecognitionException("The uploaded image could not be read.", exception);
        } catch (JacksonException | NullPointerException exception) {
            throw new FoodRecognitionException("The food recognition service returned invalid results.", exception);
        }
    }

    private void validate(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new InvalidImageException("Choose an image before analysing it.");
        }
        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new InvalidImageException("The image must be 10 MB or smaller.");
        }
        if (image.getContentType() == null || !ALLOWED_CONTENT_TYPES.contains(image.getContentType())) {
            throw new InvalidImageException("Use a JPEG, PNG, or WebP image.");
        }
    }

    private List<DetectedFoodResponse> cleanItems(List<DetectedFoodResponse> items) {
        if (items == null) {
            throw new FoodRecognitionException("The food recognition service returned invalid results.");
        }

        Map<String, DetectedFoodResponse> uniqueItems = new LinkedHashMap<>();
        for (DetectedFoodResponse item : items) {
            if (item == null || item.name() == null || item.name().isBlank()) {
                continue;
            }

            String name = item.name().trim();
            String quantity = item.quantity() == null || item.quantity().isBlank()
                    ? null
                    : item.quantity().trim();
            Double confidence = validConfidence(item.confidence()) ? item.confidence() : null;
            uniqueItems.putIfAbsent(
                    name.toLowerCase(Locale.ROOT),
                    new DetectedFoodResponse(name, quantity, confidence));
        }
        return List.copyOf(uniqueItems.values());
    }

    private boolean validConfidence(Double confidence) {
        return confidence != null
                && Double.isFinite(confidence)
                && confidence >= 0
                && confidence <= 1;
    }
}
