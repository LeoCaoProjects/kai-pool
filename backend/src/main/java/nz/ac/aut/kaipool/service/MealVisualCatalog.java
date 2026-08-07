package nz.ac.aut.kaipool.service;

import java.text.Normalizer;
import java.util.Locale;

import org.springframework.stereotype.Component;

@Component
public class MealVisualCatalog {

    private static final String FRIED_RICE = "https://www.themealdb.com/images/media/meals/wuyd2h1765655837.jpg";
    private static final String SHAKSHUKA = "https://www.themealdb.com/images/media/meals/g373701551450225.jpg";
    private static final String CURRY = "https://www.themealdb.com/images/media/meals/vwrpps1503068729.jpg";
    private static final String OMELETTE = "https://www.themealdb.com/images/media/meals/hqaejl1695738653.jpg";
    private static final String SOUP = "https://www.themealdb.com/images/media/meals/x2fw9e1560460636.jpg";
    private static final String PASTA = "https://www.themealdb.com/images/media/meals/wvqpwt1468339226.jpg";
    private static final String ROAST_CHICKEN = "https://www.themealdb.com/images/media/meals/nlxald1764112200.jpg";
    private static final String STIR_FRY = "https://www.themealdb.com/images/media/meals/rwvw8q1765660071.jpg";
    private static final String VEGETABLE_BAKE = "https://www.themealdb.com/images/media/meals/w8umt11583268117.jpg";

    public MealVisual forMeal(String mealName) {
        String normalized = normalize(mealName);
        if (normalized.contains("shakshuka")) {
            return exact(SHAKSHUKA, "Shakshuka");
        }
        if (normalized.contains("fried rice")) {
            return exact(FRIED_RICE, "Chicken Fried Rice");
        }
        if (normalized.contains("curry")) {
            return representative(CURRY, "curry");
        }
        if (containsAny(normalized, "omelette", "frittata", "egg hash")) {
            return representative(OMELETTE, "egg dish");
        }
        if (containsAny(normalized, "soup", "minestrone", "stew")) {
            return representative(SOUP, "soup");
        }
        if (normalized.contains("pasta")) {
            return representative(PASTA, "pasta");
        }
        if (normalized.contains("roast chicken")) {
            return representative(ROAST_CHICKEN, "roast chicken");
        }
        if (containsAny(normalized, "stir fry", "stir-fry", "skillet")) {
            return representative(STIR_FRY, "stir-fry");
        }
        if (containsAny(normalized, "baked", "vegetable", "bowl")) {
            return representative(VEGETABLE_BAKE, "vegetable meal");
        }
        return representative(FRIED_RICE, "shared meal");
    }

    public String descriptionFor(String mealName) {
        return switch (normalize(mealName)) {
            case "chicken fried rice" -> "Golden fried rice with tender chicken, eggs and colourful vegetables from both food pools.";
            case "egg fried rice" -> "A quick, savoury rice dish where eggs and vegetables turn simple leftovers into a shared meal.";
            case "roast chicken with root vegetables" -> "Comforting roast chicken surrounded by caramelised root vegetables for an easy shared dinner.";
            case "kumara and egg hash" -> "Crisp kūmara, eggs and aromatics cooked together into a hearty Aotearoa-inspired hash.";
            case "chicken curry and rice" -> "A warming chicken and tomato curry served with rice and built mostly from ingredients already available.";
            case "shakshuka" -> "Eggs gently cooked in a rich tomato and capsicum sauce, ready to place at the centre of the table.";
            case "vegetable frittata" -> "A flexible baked egg dish packed with vegetables and ideal for sharing or saving for later.";
            case "chicken noodle soup" -> "Tender chicken, noodles and vegetables in a warming broth made collaboratively.";
            case "hearty vegetable soup" -> "A generous pot of seasonal vegetables simmered into a simple, low-waste meal.";
            case "minestrone" -> "Tomatoes, beans, vegetables and pasta combined in a filling Italian-inspired soup.";
            case "pasta primavera" -> "Colourful vegetables folded through pasta for a bright and straightforward shared meal.";
            case "bread and vegetable omelette" -> "A savoury omelette using bread, eggs and vegetables for a satisfying South Asian-inspired meal.";
            case "chicken and vegetable stir fry" -> "Chicken and crisp vegetables quickly cooked together and served with rice or noodles.";
            case "tomato rice bowl" -> "A flexible rice bowl layered with tomatoes, vegetables and a shared protein.";
            case "loaded baked kumara" -> "Roasted kūmara filled with a colourful mixture of protein, tomatoes, cheese and spring onion.";
            case "vegetable rice soup" -> "Rice and vegetables simmered into a comforting soup with an optional shared protein.";
            default -> "A practical collaborative meal designed around ingredients both people already have.";
        };
    }

    private static MealVisual exact(String imageUrl, String mealName) {
        return new MealVisual(imageUrl, "TheMealDB", "Photo: " + mealName + " · TheMealDB");
    }

    private static MealVisual representative(String imageUrl, String category) {
        return new MealVisual(imageUrl, "TheMealDB", "Representative " + category + " photo · TheMealDB");
    }

    private static boolean containsAny(String value, String... choices) {
        for (String choice : choices) {
            if (value.contains(choice)) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    public record MealVisual(String imageUrl, String source, String attribution) {
    }
}
