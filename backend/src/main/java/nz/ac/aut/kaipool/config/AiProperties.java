package nz.ac.aut.kaipool.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(String openaiApiKey, String openaiModel) {

    public boolean isOpenAiConfigured() {
        return openaiApiKey != null && !openaiApiKey.isBlank();
    }
}
