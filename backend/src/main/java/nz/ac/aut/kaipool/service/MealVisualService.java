package nz.ac.aut.kaipool.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.service.CloudflareMealImageClient.GeneratedMealImage;
import nz.ac.aut.kaipool.service.MealVisualCatalog.MealVisual;
import nz.ac.aut.kaipool.service.TheMealDbImageClient.ExternalMealImage;

@Service
public class MealVisualService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MealVisualService.class);

    private final TheMealDbImageClient theMealDbClient;
    private final CloudflareMealImageClient cloudflareClient;
    private final MealImageAssetService imageAssetService;
    private final MealVisualCatalog visualCatalog;

    public MealVisualService(
            TheMealDbImageClient theMealDbClient,
            CloudflareMealImageClient cloudflareClient,
            MealImageAssetService imageAssetService,
            MealVisualCatalog visualCatalog) {
        this.theMealDbClient = theMealDbClient;
        this.cloudflareClient = cloudflareClient;
        this.imageAssetService = imageAssetService;
        this.visualCatalog = visualCatalog;
    }

    public List<CollaborativeMealResponse> addImages(List<CollaborativeMealResponse> meals) {
        List<CollaborativeMealResponse> enriched = new ArrayList<>();
        boolean generatedOneImage = false;
        for (CollaborativeMealResponse meal : meals) {
            Optional<ExternalMealImage> external = theMealDbClient.findRelevantImage(
                    meal.mealName(), combinedIngredients(meal));
            if (external.isPresent()) {
                ExternalMealImage image = external.get();
                enriched.add(withVisual(meal, image.imageUrl(), image.source(), image.attribution()));
                continue;
            }

            if (!generatedOneImage && cloudflareClient.isConfigured()) {
                Optional<GeneratedMealImage> generated = cloudflareClient.generate(meal);
                if (generated.isPresent()) {
                    try {
                        GeneratedMealImage image = generated.get();
                        String imageUrl = imageAssetService.store(meal.mealName(), image.contentType(), image.bytes());
                        enriched.add(withVisual(meal, imageUrl, "Cloudflare Workers AI", "AI-generated for Kai Pool"));
                        generatedOneImage = true;
                        continue;
                    } catch (RuntimeException exception) {
                        LOGGER.warn("Could not store generated image for {}", meal.mealName());
                    }
                }
            }

            MealVisual fallback = visualCatalog.forMeal(meal.mealName());
            enriched.add(withVisual(meal, fallback.imageUrl(), fallback.source(), fallback.attribution()));
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

    private static List<String> combinedIngredients(CollaborativeMealResponse meal) {
        return Stream.concat(meal.ingredientsFromYou().stream(), meal.ingredientsFromThem().stream())
                .distinct()
                .limit(12)
                .toList();
    }
}
