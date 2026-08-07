package nz.ac.aut.kaipool.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.domain.MealImageAsset;
import nz.ac.aut.kaipool.exception.ResourceNotFoundException;
import nz.ac.aut.kaipool.repository.MealImageAssetRepository;

@Service
public class MealImageAssetService {

    private final MealImageAssetRepository repository;

    public MealImageAssetService(MealImageAssetRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public String store(String mealName, String contentType, byte[] imageData) {
        if (imageData == null || imageData.length == 0 || imageData.length > 5_000_000) {
            throw new IllegalArgumentException("Generated meal image must be between 1 byte and 5 MB");
        }
        String id = digest(mealName, imageData);
        if (!repository.existsById(id)) {
            repository.save(new MealImageAsset(id, contentType, imageData));
        }
        return "/api/meal-images/" + id;
    }

    @Transactional(readOnly = true)
    public MealImageAsset getRequired(String id) {
        if (id == null || !id.matches("[a-f0-9]{64}")) {
            throw new ResourceNotFoundException("Meal image not found");
        }
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meal image not found"));
    }

    private static String digest(String mealName, byte[] imageData) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(mealName.getBytes(StandardCharsets.UTF_8));
            digest.update((byte) 0);
            digest.update(imageData);
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
