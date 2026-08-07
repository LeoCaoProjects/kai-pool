package nz.ac.aut.kaipool.domain;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(length = 1000)
    private String bio;

    private String profileImageUrl;
    private Double latitude;
    private Double longitude;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_food_cultures", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "food_culture")
    private Set<String> foodCultures = new LinkedHashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_food_cultures_to_explore", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "food_culture")
    private Set<String> foodCulturesToExplore = new LinkedHashSet<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected User() {
    }

    public User(String name, String email, String passwordHash) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    @PrePersist
    void setCreatedAt() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Set<String> getFoodCultures() {
        return foodCultures;
    }

    public void setFoodCultures(Set<String> foodCultures) {
        this.foodCultures = foodCultures == null ? new LinkedHashSet<>() : new LinkedHashSet<>(foodCultures);
    }

    public Set<String> getFoodCulturesToExplore() {
        return foodCulturesToExplore;
    }

    public void setFoodCulturesToExplore(Set<String> foodCulturesToExplore) {
        this.foodCulturesToExplore = foodCulturesToExplore == null
                ? new LinkedHashSet<>()
                : new LinkedHashSet<>(foodCulturesToExplore);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
