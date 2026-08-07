package nz.ac.aut.kaipool.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import nz.ac.aut.kaipool.domain.MealImageAsset;
import nz.ac.aut.kaipool.repository.MealImageAssetRepository;

class MealImageAssetServiceTests {

    @Test
    void storesGeneratedBytesBehindAnOpaqueStableUrl() {
        MealImageAssetRepository repository = mock(MealImageAssetRepository.class);
        when(repository.existsById(any())).thenReturn(false, true);
        MealImageAssetService service = new MealImageAssetService(repository);

        String first = service.store("Shared curry", "image/png", new byte[] { 1, 2, 3 });
        String second = service.store("Shared curry", "image/png", new byte[] { 1, 2, 3 });

        assertThat(first).isEqualTo(second).matches("/api/meal-images/[a-f0-9]{64}");
        verify(repository).save(any(MealImageAsset.class));
    }

    @Test
    void rejectsEmptyAndOversizedGeneratedImages() {
        MealImageAssetRepository repository = mock(MealImageAssetRepository.class);
        MealImageAssetService service = new MealImageAssetService(repository);

        assertThatThrownBy(() -> service.store("Meal", "image/png", new byte[0]))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.store("Meal", "image/png", new byte[5_000_001]))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }
}
