package nz.ac.aut.kaipool.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.service.PexelsMealImageClient.PexelsMealImage;

class MealVisualServiceTests {

    @Test
    void prefersPexelsPhotography() {
        PexelsMealImageLookup pexels = mock(PexelsMealImageLookup.class);
        when(pexels.find(anyString())).thenReturn(Optional.of(
                new PexelsMealImage("https://images.example/fried-rice.jpg", "Photo by Kai on Pexels")));

        MealVisualService service = new MealVisualService(pexels, new MealVisualCatalog());
        CollaborativeMealResponse result = service.addImages(List.of(meal("Chicken fried rice"))).getFirst();

        assertThat(result.imageUrl()).isEqualTo("https://images.example/fried-rice.jpg");
        assertThat(result.imageSource()).isEqualTo("Pexels");
    }

    @Test
    void leavesTheImageEmptyWhenPexelsHasNoPhoto() {
        PexelsMealImageLookup pexels = mock(PexelsMealImageLookup.class);
        when(pexels.find(anyString())).thenReturn(Optional.empty());

        MealVisualService service = new MealVisualService(pexels, new MealVisualCatalog());
        CollaborativeMealResponse result = service.addImages(List.of(meal("Chicken fried rice"))).getFirst();

        assertThat(result.imageUrl()).isNull();
        assertThat(result.imageSource()).isNull();
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
