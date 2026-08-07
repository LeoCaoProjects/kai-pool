package nz.ac.aut.kaipool.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.CreateFoodRequest;
import nz.ac.aut.kaipool.dto.FoodResponse;
import nz.ac.aut.kaipool.dto.MarketplaceFoodResponse;
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

    /**
     * Returns listings whose owners have chosen a map location on their profile.
     * Email, biography, and other private profile fields are intentionally omitted.
     */
    @Transactional(readOnly = true)
    public List<MarketplaceFoodResponse> getMarketplaceFoods() {
        return foodRepository.findMarketplaceFoodsWithOwnerLocation().stream()
                .map(this::toMarketplaceResponse)
                .toList();
    }

    @Transactional
    public FoodResponse createFood(String email, CreateFoodRequest request) {
        User owner = userService.getRequiredByEmail(email);
        Food food = new Food(
                owner,
                request.name().trim(),
                cleanOptional(request.imageUrl()),
                cleanOptional(request.quantity()),
                request.availability());
        return toResponse(foodRepository.save(food));
    }

    @Transactional
    public FoodResponse updateFood(String email, Long id, UpdateFoodRequest request) {
        Food food = getOwnedFood(email, id);
        food.setName(request.name().trim());
        food.setImageUrl(cleanOptional(request.imageUrl()));
        food.setQuantity(cleanOptional(request.quantity()));
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

    private String cleanOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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

    private MarketplaceFoodResponse toMarketplaceResponse(Food food) {
        User owner = food.getOwner();
        return new MarketplaceFoodResponse(
                food.getId(),
                food.getName(),
                food.getImageUrl(),
                food.getQuantity(),
                food.getAvailability(),
                food.getCreatedAt(),
                owner.getId(),
                owner.getName(),
                owner.getLatitude(),
                owner.getLongitude());
    }
}
