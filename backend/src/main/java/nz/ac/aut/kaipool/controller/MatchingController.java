package nz.ac.aut.kaipool.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import nz.ac.aut.kaipool.dto.CollaborativeMealResponse;
import nz.ac.aut.kaipool.dto.CookingMatchResponse;
import nz.ac.aut.kaipool.service.CollaborativeRecipeService;
import nz.ac.aut.kaipool.service.MatchingService;

@RestController
@RequestMapping("/api/matches")
public class MatchingController {

    private final MatchingService matchingService;
    private final CollaborativeRecipeService collaborativeRecipeService;

    public MatchingController(
            MatchingService matchingService,
            CollaborativeRecipeService collaborativeRecipeService) {
        this.matchingService = matchingService;
        this.collaborativeRecipeService = collaborativeRecipeService;
    }

    @GetMapping
    public List<CookingMatchResponse> getMatches(Principal principal) {
        return matchingService.findMatches(principal.getName());
    }

    @PostMapping("/{matchedUserId}/recipes")
    public List<CollaborativeMealResponse> getRecipes(
            Principal principal,
            @PathVariable Long matchedUserId) {
        return collaborativeRecipeService.generateForMatch(principal.getName(), matchedUserId);
    }
}
