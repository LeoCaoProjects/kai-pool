package nz.ac.aut.kaipool.service;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.CreateFoodRequest;
import nz.ac.aut.kaipool.dto.FoodResponse;
import nz.ac.aut.kaipool.dto.MarketplaceFoodResponse;
import nz.ac.aut.kaipool.dto.UpdateFoodRequest;
import nz.ac.aut.kaipool.exception.ForbiddenException;
import nz.ac.aut.kaipool.exception.ListingUnavailableException;
import nz.ac.aut.kaipool.exception.ResourceNotFoundException;
import nz.ac.aut.kaipool.repository.FoodRepository;
import nz.ac.aut.kaipool.util.GeoUtils;

@Service
public class FoodService {

    private final FoodRepository foodRepository;
    private final UserService userService;
    private final double maxMarketplaceDistanceKm;

    public FoodService(
            FoodRepository foodRepository,
            UserService userService,
            @Value("${app.marketplace.max-distance-km:30}") double maxMarketplaceDistanceKm) {
        this.foodRepository = foodRepository;
        this.userService = userService;
        this.maxMarketplaceDistanceKm = maxMarketplaceDistanceKm;
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
    public List<MarketplaceFoodResponse> getMarketplaceFoods(String email) {
        User viewer = userService.getRequiredByEmail(email);
        if (viewer.getLatitude() == null || viewer.getLongitude() == null) {
            return List.of();
        }
        return foodRepository.findMarketplaceFoodsWithOwnerLocation().stream()
                .filter(food -> !food.getOwner().getId().equals(viewer.getId()))
                .map(food -> toMarketplaceResponse(food, viewer))
                .filter(listing -> listing.distanceKm() != null
                        && listing.distanceKm() <= maxMarketplaceDistanceKm)
                .toList();
    }

    @Transactional(readOnly = true)
    public MarketplaceFoodResponse getMarketplaceFood(String email, Long id) {
        User viewer = userService.getRequiredByEmail(email);
        Food food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Giveaway listing not found"));
        boolean claimedByViewer = food.getClaimedBy() != null
                && food.getClaimedBy().getId().equals(viewer.getId());
        if (food.getAvailability() != nz.ac.aut.kaipool.domain.FoodAvailability.GIVEAWAY
                || (food.getClaimedBy() != null && !claimedByViewer)
                || food.getOwner().getId().equals(viewer.getId())) {
            throw new ResourceNotFoundException("Giveaway listing not found");
        }
        MarketplaceFoodResponse response = toMarketplaceResponse(food, viewer);
        if (!claimedByViewer
                && (response.distanceKm() == null || response.distanceKm() > maxMarketplaceDistanceKm)) {
            throw new ResourceNotFoundException("Giveaway listing not found");
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<MarketplaceFoodResponse> getClaimedListings(String email) {
        User viewer = userService.getRequiredByEmail(email);
        return foodRepository.findClaimedListings(viewer.getId()).stream()
                .map(food -> toMarketplaceResponse(food, viewer))
                .toList();
    }

    @Transactional
    public MarketplaceFoodResponse claimMarketplaceFood(String email, Long id) {
        User claimant = userService.getRequiredByEmail(email);
        Food food = foodRepository.findByIdForClaim(id)
                .orElseThrow(() -> new ResourceNotFoundException("Giveaway listing not found"));
        if (food.getOwner().getId().equals(claimant.getId())) {
            throw new ForbiddenException("You cannot claim your own giveaway");
        }
        if (food.getAvailability() != nz.ac.aut.kaipool.domain.FoodAvailability.GIVEAWAY
                || food.getClaimedBy() != null) {
            throw new ListingUnavailableException("This giveaway has already been collected or is no longer available");
        }
        food.setClaimedBy(claimant);
        food.setClaimedAt(Instant.now());
        return toMarketplaceResponse(foodRepository.save(food), claimant);
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
        ensureNotClaimed(food);
        food.setName(request.name().trim());
        food.setImageUrl(cleanOptional(request.imageUrl()));
        food.setQuantity(cleanOptional(request.quantity()));
        food.setAvailability(request.availability());
        return toResponse(foodRepository.save(food));
    }

    @Transactional
    public void deleteFood(String email, Long id) {
        Food food = getOwnedFood(email, id);
        ensureNotClaimed(food);
        foodRepository.delete(food);
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

    private void ensureNotClaimed(Food food) {
        if (food.getClaimedBy() != null) {
            throw new ListingUnavailableException("Collected giveaways cannot be changed or deleted");
        }
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

    private MarketplaceFoodResponse toMarketplaceResponse(Food food, User viewer) {
        User owner = food.getOwner();
        Double distanceKm = null;
        if (viewer.getLatitude() != null && viewer.getLongitude() != null
                && owner.getLatitude() != null && owner.getLongitude() != null) {
            distanceKm = Math.round(GeoUtils.distanceKm(
                    viewer.getLatitude(), viewer.getLongitude(),
                    owner.getLatitude(), owner.getLongitude()) * 10.0) / 10.0;
        }
        return new MarketplaceFoodResponse(
                food.getId(),
                food.getName(),
                food.getImageUrl(),
                food.getQuantity(),
                food.getAvailability(),
                food.getCreatedAt(),
                owner.getId(),
                owner.getName(),
                approximateMapCoordinate(owner.getLatitude()),
                approximateMapCoordinate(owner.getLongitude()),
                distanceKm,
                food.getClaimedAt());
    }

    private Double approximateMapCoordinate(Double coordinate) {
        return coordinate == null ? null : Math.round(coordinate * 100.0) / 100.0;
    }
}
