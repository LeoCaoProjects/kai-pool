package nz.ac.aut.kaipool.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import nz.ac.aut.kaipool.dto.CreateFoodRequest;
import nz.ac.aut.kaipool.dto.FoodResponse;
import nz.ac.aut.kaipool.dto.UpdateFoodRequest;
import nz.ac.aut.kaipool.service.FoodService;

@RestController
@RequestMapping("/api/foods")
public class FoodController {

    private final FoodService foodService;

    public FoodController(FoodService foodService) {
        this.foodService = foodService;
    }

    @GetMapping
    public List<FoodResponse> getFoods(Principal principal) {
        return foodService.getCurrentUsersFood(principal.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodResponse createFood(Principal principal, @Valid @RequestBody CreateFoodRequest request) {
        return foodService.createFood(principal.getName(), request);
    }

    @GetMapping("/{id}")
    public FoodResponse getFood(Principal principal, @PathVariable Long id) {
        return foodService.getFood(principal.getName(), id);
    }

    @PutMapping("/{id}")
    public FoodResponse updateFood(
            Principal principal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateFoodRequest request) {
        return foodService.updateFood(principal.getName(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFood(Principal principal, @PathVariable Long id) {
        foodService.deleteFood(principal.getName(), id);
    }
}
