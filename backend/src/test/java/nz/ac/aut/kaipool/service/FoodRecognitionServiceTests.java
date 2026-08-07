package nz.ac.aut.kaipool.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import nz.ac.aut.kaipool.ai.FoodRecognitionClient;
import nz.ac.aut.kaipool.dto.FoodRecognitionResponse;
import nz.ac.aut.kaipool.exception.FoodRecognitionException;
import tools.jackson.databind.json.JsonMapper;

class FoodRecognitionServiceTests {

    private final FoodRecognitionClient client = mock(FoodRecognitionClient.class);
    private final FoodRecognitionService service = new FoodRecognitionService(
            client,
            JsonMapper.builder().build());

    @Test
    void parsesCleansAndDeduplicatesValidResults() {
        when(client.recognize(any(byte[].class), eq("image/jpeg"))).thenReturn("""
                {"items":[
                  {"name":" Apple ","quantity":" 2 ","confidence":0.95},
                  {"name":"apple","quantity":"1","confidence":0.7},
                  {"name":"  ","quantity":null,"confidence":0.2},
                  {"name":"Bread","quantity":null,"confidence":2}
                ]}
                """);

        FoodRecognitionResponse response = service.recognize(image());

        assertThat(response.items()).hasSize(2);
        assertThat(response.items().getFirst().name()).isEqualTo("Apple");
        assertThat(response.items().getFirst().quantity()).isEqualTo("2");
        assertThat(response.items().get(1).confidence()).isNull();
    }

    @Test
    void rejectsInvalidProviderJson() {
        when(client.recognize(any(byte[].class), eq("image/jpeg"))).thenReturn("not json");

        assertThatThrownBy(() -> service.recognize(image()))
                .isInstanceOf(FoodRecognitionException.class)
                .hasMessage("The food recognition service returned invalid results.");
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("image", "food.jpg", "image/jpeg", new byte[] {1, 2, 3});
    }
}
