package nz.ac.aut.kaipool.service;

import java.util.LinkedHashSet;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.UpdateUserRequest;
import nz.ac.aut.kaipool.dto.UserResponse;
import nz.ac.aut.kaipool.exception.ResourceNotFoundException;
import nz.ac.aut.kaipool.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public User getRequiredByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        return toResponse(getRequiredByEmail(email));
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(Long id) {
        return userRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public UserResponse updateCurrentUser(String email, UpdateUserRequest request) {
        User user = getRequiredByEmail(email);
        user.setName(request.name().trim());
        user.setBio(cleanOptional(request.bio()));
        user.setProfileImageUrl(cleanOptional(request.profileImageUrl()));
        user.setLatitude(roundApproximateLocation(request.latitude()));
        user.setLongitude(roundApproximateLocation(request.longitude()));
        user.setFoodCultures(cleanCultures(request.foodCultures()));
        user.setFoodCulturesToExplore(cleanCultures(request.foodCulturesToExplore()));
        if (request.onboardingCompleted() != null) {
            user.setOnboardingCompleted(request.onboardingCompleted());
        }
        return toResponse(userRepository.save(user));
    }

    private String cleanOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Set<String> cleanCultures(Set<String> cultures) {
        if (cultures == null) {
            return Set.of();
        }
        LinkedHashSet<String> cleaned = new LinkedHashSet<>();
        cultures.stream()
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .forEach(cleaned::add);
        return cleaned;
    }

    private Double roundApproximateLocation(Double coordinate) {
        return coordinate == null ? null : Math.round(coordinate * 100.0) / 100.0;
    }

    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getBio(),
                user.getProfileImageUrl(),
                user.getLatitude(),
                user.getLongitude(),
                new LinkedHashSet<>(user.getFoodCultures()),
                new LinkedHashSet<>(user.getFoodCulturesToExplore()),
                user.isOnboardingCompleted(),
                user.getCreatedAt());
    }
}
