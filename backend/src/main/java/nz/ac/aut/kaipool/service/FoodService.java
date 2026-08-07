package nz.ac.aut.kaipool.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.CreateFoodRequest;
import nz.ac.aut.kaipool.dto.FoodResponse;
import nz.ac.aut.kaipool.dto.UpdateFoodRequest;
import nz.ac.aut.kaipool.exception.ForbiddenException;
import nz.ac.aut.kaipool.exception.ResourceNotFoundException;
import nz.ac.aut.kaipool.repository.FoodRepository;

@Service
public class FoodService {

    private final FoodRepository foodRepository;
    private final UserService userService;

    public FoodService(FoodRepository foodRepository, UserService userService) {
        this.foodRepository = foodRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<FoodResponse> getCurrentUsersFood(String email) {
        User owner = userService.getRequiredByEmail(email);
        return foodRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public FoodResponse getFood(String email, Long id) {
        return toResponse(getOwnedFood(email, id));
    }

    @Transactional
    public FoodResponse createFood(String email, CreateFoodRequest request) {
        User owner = userService.getRequiredByEmail(email);
        Food food = new Food(
                owner,
                request.name().trim(),
                normalizeImageUrl(request.imageUrl()),
                normalizeQuantity(request.quantity()),
                request.availability());
        return toResponse(foodRepository.save(food));
    }

    @Transactional
    public FoodResponse updateFood(String email, Long id, UpdateFoodRequest request) {
        Food food = getOwnedFood(email, id);
        food.setName(request.name().trim());
        food.setImageUrl(normalizeImageUrl(request.imageUrl()));
        food.setQuantity(normalizeQuantity(request.quantity()));
        food.setAvailability(request.availability());
        return toResponse(foodRepository.save(food));
    }

    @Transactional
    public void deleteFood(String email, Long id) {
        foodRepository.delete(getOwnedFood(email, id));
    }

    private Food getOwnedFood(String email, Long id) {
        Food food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food item not found"));
        if (!food.getOwner().getEmail().equalsIgnoreCase(email)) {
            throw new ForbiddenException("You cannot change another user's food");
        }
        return food;
    }

    private static String normalizeQuantity(String quantity) {
        if (quantity == null) {
            return null;
        }
        String trimmed = quantity.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String normalizeImageUrl(String imageUrl) {
        if (imageUrl == null) {
            return null;
        }
        String trimmed = imageUrl.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private FoodResponse toResponse(Food food) {
        return new FoodResponse(
                food.getId(),
                food.getOwner().getId(),
                food.getName(),
                food.getImageUrl(),
                food.getQuantity(),
                food.getAvailability(),
                food.getCreatedAt());
    }
}
