package nz.ac.aut.kaipool.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

class CloudflareMealImageClientTests {

    @Test
    void readsTheDocumentedRestApiImageEnvelope() {
        String encoded = CloudflareMealImageClient.readBase64Image(Map.of(
                "success", true,
                "result", Map.of("image", "AQID")));

        assertThat(encoded).isEqualTo("AQID");
    }

    @Test
    void rejectsResponsesWithoutAnImage() {
        assertThat(CloudflareMealImageClient.readBase64Image(Map.of("success", false))).isNull();
        assertThat(CloudflareMealImageClient.readBase64Image(null)).isNull();
    }
}
