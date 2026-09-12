package nz.ac.aut.kaipool.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import nz.ac.aut.kaipool.domain.MealPhotoCacheEntry;
import nz.ac.aut.kaipool.repository.MealPhotoCacheRepository;
import nz.ac.aut.kaipool.service.PexelsMealImageClient.PexelsMealImage;

@Service
public class PexelsMealImageLookup {

    private final MealPhotoCacheRepository repository;
    private final PexelsMealImageClient client;

    public PexelsMealImageLookup(MealPhotoCacheRepository repository, PexelsMealImageClient client) {
        this.repository = repository;
        this.client = client;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<PexelsMealImage> find(String mealName) {
        String hash = hash(mealName);
        var cached = repository.findById(hash);
        if (cached.isPresent()) {
            MealPhotoCacheEntry entry = cached.get();
            return entry.getImageUrl() == null ? Optional.empty()
                    : Optional.of(new PexelsMealImage(entry.getImageUrl(), entry.getAttribution()));
        }
        Optional<PexelsMealImage> found = client.search(mealName);
        found.ifPresent(image -> repository.save(
                new MealPhotoCacheEntry(hash, image.imageUrl(), image.attribution())));
        return found;
    }

    @Transactional(readOnly = true)
    public Optional<PexelsMealImage> findCached(String mealName) {
        return repository.findById(hash(mealName))
                .filter(entry -> entry.getImageUrl() != null)
                .map(entry -> new PexelsMealImage(entry.getImageUrl(), entry.getAttribution()));
    }

    @Async
    public void warm(List<String> mealNames) {
        mealNames.stream().filter(name -> name != null && !name.isBlank()).distinct().limit(10)
                .forEach(this::find);
    }

    private static String hash(String mealName) {
        String normalized = mealName.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(("pexels-v1|" + normalized).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
