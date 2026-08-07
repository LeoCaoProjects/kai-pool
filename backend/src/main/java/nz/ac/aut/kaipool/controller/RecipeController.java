package nz.ac.aut.kaipool.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import nz.ac.aut.kaipool.dto.RecipeSuggestionResponse;
import nz.ac.aut.kaipool.service.RecipeSuggestionService;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    private final RecipeSuggestionService recipeSuggestionService;

    public RecipeController(RecipeSuggestionService recipeSuggestionService) {
        this.recipeSuggestionService = recipeSuggestionService;
    }

    @GetMapping("/suggestions")
    public List<RecipeSuggestionResponse> getSuggestions(
            Principal principal, @RequestParam(defaultValue = "8") int limit) {
        return recipeSuggestionService.suggestForCurrentUser(principal.getName(), limit);
    }
}
