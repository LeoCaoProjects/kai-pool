package nz.ac.aut.kaipool;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import nz.ac.aut.kaipool.dto.RecipeSuggestionResponse;
import nz.ac.aut.kaipool.service.CultureRecipeCatalog;
import nz.ac.aut.kaipool.service.RecipeSuggestionService;

@SpringBootTest
@ActiveProfiles("test")
class RecipeSuggestionServiceTest {

    @Autowired
    private RecipeSuggestionService recipeSuggestionService;

    @Autowired
    private CultureRecipeCatalog cultureRecipeCatalog;

    @Test
    void catalogLoadsFromCsv() {
        assertThat(cultureRecipeCatalog.getRecipes()).isNotEmpty();
    }

    @Test
    void suggestsRecipesWhenUserHasPartialIngredients() {
        List<RecipeSuggestionResponse> suggestions = recipeSuggestionService.suggestForPool(
                List.of("chicken", "kumara"), 5);

        assertThat(suggestions).isNotEmpty();
        assertThat(suggestions.getFirst().matchedIngredients()).isNotEmpty();
        assertThat(suggestions.getFirst().missingIngredients()).isNotEmpty();
    }
}
