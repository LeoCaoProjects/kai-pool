package nz.ac.aut.kaipool.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "meal_photo_cache")
public class MealPhotoCacheEntry {

    @Id
    @Column(length = 64)
    private String queryHash;

    @Column(length = 1000)
    private String imageUrl;

    @Column(length = 300)
    private String attribution;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected MealPhotoCacheEntry() {
    }

    public MealPhotoCacheEntry(String queryHash, String imageUrl, String attribution) {
        this.queryHash = queryHash;
        this.imageUrl = imageUrl;
        this.attribution = attribution;
        this.createdAt = Instant.now();
    }

    public String getImageUrl() { return imageUrl; }
    public String getAttribution() { return attribution; }
}
