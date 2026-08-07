package nz.ac.aut.kaipool.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "meal_image_assets")
public class MealImageAsset {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 64)
    private String contentType;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] imageData;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected MealImageAsset() {
    }

    public MealImageAsset(String id, String contentType, byte[] imageData) {
        this.id = id;
        this.contentType = contentType;
        this.imageData = imageData.clone();
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getContentType() {
        return contentType;
    }

    public byte[] getImageData() {
        return imageData.clone();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
