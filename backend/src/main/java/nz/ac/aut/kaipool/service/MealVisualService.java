package nz.ac.aut.kaipool.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.service.PexelsMealImageClient.PexelsMealImage;

@Service
public class MealVisualService {

    private final PexelsMealImageLookup pexelsLookup;
    private final MealVisualCatalog visualCatalog;

    public MealVisualService(
            PexelsMealImageLookup pexelsLookup,
            MealVisualCatalog visualCatalog) {
        this.pexelsLookup = pexelsLookup;
        this.visualCatalog = visualCatalog;
    }

    public List<CollaborativeMealResponse> addImages(List<CollaborativeMealResponse> meals) {
        List<CollaborativeMealResponse> enriched = new ArrayList<>();
        for (CollaborativeMealResponse meal : meals) {
            PexelsMealImage image = pexelsLookup.find(meal.mealName()).orElse(null);
            enriched.add(image == null
                    ? withVisual(meal, null, null, null)
                    : withVisual(meal, image.imageUrl(), "Pexels", image.attribution()));
        }
        return List.copyOf(enriched);
    }

    private CollaborativeMealResponse withVisual(
            CollaborativeMealResponse meal,
            String imageUrl,
            String source,
            String attribution) {
        String description = meal.description() == null || meal.description().isBlank()
                ? visualCatalog.descriptionFor(meal.mealName())
                : meal.description();
        return new CollaborativeMealResponse(
                meal.mealName(),
                description,
                meal.culturalOriginOrInspiration(),
                meal.ingredientsFromYou(),
                meal.ingredientsFromThem(),
                meal.optionalMissingIngredients(),
                meal.cookingInstructions(),
                imageUrl,
                source,
                attribution);
    }
}
