package nz.ac.aut.kaipool.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "collaborative_recipe_cache")
public class CollaborativeRecipeCacheEntry {

    @Id
    @Column(length = 64)
    private String fingerprint;

    @Column(nullable = false, columnDefinition = "text")
    private String mealsJson;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected CollaborativeRecipeCacheEntry() {
    }

    public CollaborativeRecipeCacheEntry(String fingerprint, String mealsJson) {
        this.fingerprint = fingerprint;
        this.mealsJson = mealsJson;
        this.createdAt = Instant.now();
    }

    public String getFingerprint() {
        return fingerprint;
    }

    public String getMealsJson() {
        return mealsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
