package nz.ac.aut.kaipool.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.matching")
public record MatchingProperties(double defaultMaxDistanceKm) {
}
