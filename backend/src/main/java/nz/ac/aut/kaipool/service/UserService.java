package nz.ac.aut.kaipool.service;

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
        user.setBio(request.bio());
        user.setProfileImageUrl(request.profileImageUrl());
        user.setLatitude(request.latitude());
        user.setLongitude(request.longitude());
        user.setFoodCultures(request.foodCultures());
        user.setFoodCulturesToExplore(request.foodCulturesToExplore());
        return toResponse(userRepository.save(user));
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
                user.getFoodCultures(),
                user.getFoodCulturesToExplore(),
                user.getCreatedAt());
    }
}
