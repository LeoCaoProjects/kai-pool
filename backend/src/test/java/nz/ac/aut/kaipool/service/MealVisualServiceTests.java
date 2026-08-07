package nz.ac.aut.kaipool.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.service.CloudflareMealImageClient.GeneratedMealImage;
import nz.ac.aut.kaipool.service.TheMealDbImageClient.ExternalMealImage;

class MealVisualServiceTests {

    @Test
    void prefersRelevantTheMealDbPhotography() {
        TheMealDbImageClient theMealDb = mock(TheMealDbImageClient.class);
        CloudflareMealImageClient cloudflare = mock(CloudflareMealImageClient.class);
        MealImageAssetService assets = mock(MealImageAssetService.class);
        when(theMealDb.findRelevantImage(anyString(), anyList())).thenReturn(Optional.of(
                new ExternalMealImage("https://images.example/fried-rice.jpg", "TheMealDB", "Photo credit")));

        MealVisualService service = new MealVisualService(theMealDb, cloudflare, assets, new MealVisualCatalog());
        CollaborativeMealResponse result = service.addImages(List.of(meal("Chicken fried rice"))).getFirst();

        assertThat(result.imageUrl()).isEqualTo("https://images.example/fried-rice.jpg");
        assertThat(result.imageSource()).isEqualTo("TheMealDB");
        verify(cloudflare, never()).generate(any());
        verify(assets, never()).store(anyString(), anyString(), any());
    }

    @Test
    void generatesAndStoresAtMostOneMissingImagePerMatch() {
        TheMealDbImageClient theMealDb = mock(TheMealDbImageClient.class);
        CloudflareMealImageClient cloudflare = mock(CloudflareMealImageClient.class);
        MealImageAssetService assets = mock(MealImageAssetService.class);
        when(theMealDb.findRelevantImage(anyString(), anyList())).thenReturn(Optional.empty());
        when(cloudflare.isConfigured()).thenReturn(true);
        when(cloudflare.generate(any())).thenReturn(Optional.of(
                new GeneratedMealImage("image/png", new byte[] { 1, 2, 3 })));
        when(assets.store(anyString(), anyString(), any())).thenReturn("/api/meal-images/hash");

        MealVisualService service = new MealVisualService(theMealDb, cloudflare, assets, new MealVisualCatalog());
        List<CollaborativeMealResponse> results = service.addImages(List.of(
                meal("Invented chicken bowl"),
                meal("Invented vegetable soup"),
                meal("Invented egg skillet")));

        assertThat(results).hasSize(3);
        assertThat(results.getFirst().imageUrl()).isEqualTo("/api/meal-images/hash");
        assertThat(results.getFirst().imageSource()).isEqualTo("Cloudflare Workers AI");
        assertThat(results.get(1).imageUrl()).startsWith("https://www.themealdb.com/");
        verify(cloudflare, times(1)).generate(any());
        verify(assets, times(1)).store(anyString(), anyString(), any());
    }

    @Test
    void usesImmediateCategoryFallbackWhenGenerationIsNotConfigured() {
        TheMealDbImageClient theMealDb = mock(TheMealDbImageClient.class);
        CloudflareMealImageClient cloudflare = mock(CloudflareMealImageClient.class);
        MealImageAssetService assets = mock(MealImageAssetService.class);
        when(theMealDb.findRelevantImage(anyString(), anyList())).thenReturn(Optional.empty());
        when(cloudflare.isConfigured()).thenReturn(false);

        MealVisualService service = new MealVisualService(theMealDb, cloudflare, assets, new MealVisualCatalog());
        CollaborativeMealResponse result = service.addImages(List.of(meal("Garden pasta"))).getFirst();

        assertThat(result.imageUrl()).contains("themealdb.com");
        assertThat(result.imageAttribution()).contains("Representative pasta photo");
        verify(cloudflare, never()).generate(any());
    }

    private CollaborativeMealResponse meal(String name) {
        return new CollaborativeMealResponse(
                name,
                "A useful shared meal.",
                "Shared inspiration",
                List.of("Chicken"),
                List.of("Rice"),
                List.of(),
                List.of("Cook thoroughly."),
                null,
                null,
                null);
    }
}
