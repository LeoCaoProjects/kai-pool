package nz.ac.aut.kaipool.controller;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import nz.ac.aut.kaipool.domain.MealImageAsset;
import nz.ac.aut.kaipool.service.MealImageAssetService;

@RestController
@RequestMapping("/api/meal-images")
public class MealImageController {

    private final MealImageAssetService imageAssetService;

    public MealImageController(MealImageAssetService imageAssetService) {
        this.imageAssetService = imageAssetService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> getImage(@PathVariable String id) {
        MealImageAsset image = imageAssetService.getRequired(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(image.getImageData());
    }
}
