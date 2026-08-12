package nz.ac.aut.kaipool;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.jayway.jsonpath.JsonPath;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import nz.ac.aut.kaipool.repository.FoodRepository;
import nz.ac.aut.kaipool.repository.CookingConnectionRepository;
import nz.ac.aut.kaipool.repository.CollaborativeRecipeCacheRepository;
import nz.ac.aut.kaipool.repository.MealImageAssetRepository;
import nz.ac.aut.kaipool.repository.UserRepository;
import nz.ac.aut.kaipool.service.MealImageAssetService;

@SpringBootTest
@ActiveProfiles("test")
class FoundationApiTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private CookingConnectionRepository cookingConnectionRepository;

    @Autowired
    private CollaborativeRecipeCacheRepository collaborativeRecipeCacheRepository;

    @Autowired
    private MealImageAssetRepository mealImageAssetRepository;

    @Autowired
    private MealImageAssetService mealImageAssetService;

    @Autowired
    private UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        collaborativeRecipeCacheRepository.deleteAll();
        mealImageAssetRepository.deleteAll();
        cookingConnectionRepository.deleteAll();
        foodRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void registrationAndLoginWork() throws Exception {
        register("Test User", "test@kaipool.nz")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("test@kaipool.nz"))
                .andExpect(jsonPath("$.user.onboardingCompleted").value(false));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"test@kaipool.nz","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void loginSerializesCulturesForAnExistingDatabaseUser() throws Exception {
        MvcResult registration = register("Culture User", "culture@kaipool.nz")
                .andExpect(status().isCreated())
                .andReturn();
        String token = JsonPath.read(registration.getResponse().getContentAsString(), "$.token");

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"Culture User",
                                  "foodCultures":["Māori","Italian"],
                                  "foodCulturesToExplore":["Samoan"],
                                  "onboardingCompleted":true
                                }
                                """))
                .andExpect(status().isOk());

        entityManager.clear();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"culture@kaipool.nz","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.foodCultures[0]").value("Māori"))
                .andExpect(jsonPath("$.user.foodCulturesToExplore[0]").value("Samoan"));
    }

    @Test
    void currentUserCanCompleteAndReadProfile() throws Exception {
        MvcResult registration = register("Profile User", "profile@kaipool.nz")
                .andExpect(status().isCreated())
                .andReturn();
        String token = JsonPath.read(registration.getResponse().getContentAsString(), "$.token");

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"  Profile User  ",
                                  "bio":"I like sharing family recipes.",
                                  "profileImageUrl":"https://example.com/profile.jpg",
                                  "latitude":-36.8523,
                                  "longitude":174.7634,
                                  "foodCultures":["Māori","Italian"],
                                  "foodCulturesToExplore":["Samoan"],
                                  "onboardingCompleted":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Profile User"))
                .andExpect(jsonPath("$.latitude").value(-36.85))
                .andExpect(jsonPath("$.longitude").value(174.76))
                .andExpect(jsonPath("$.foodCultures[0]").value("Māori"))
                .andExpect(jsonPath("$.foodCulturesToExplore[0]").value("Samoan"))
                .andExpect(jsonPath("$.onboardingCompleted").value(true));

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").value("I like sharing family recipes."))
                .andExpect(jsonPath("$.onboardingCompleted").value(true));
    }

    @Test
    void protectedEndpointRejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/api/foods"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void scanRejectsMissingImage() throws Exception {
        MvcResult registration = register("Scanner", "scanner@kaipool.nz")
                .andExpect(status().isCreated())
                .andReturn();
        String token = JsonPath.read(registration.getResponse().getContentAsString(), "$.token");

        mockMvc.perform(post("/api/scan")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Choose an image before analysing it."));
    }

    @Test
    void expoWebDevelopmentOriginCanMakeCorsRequests() throws Exception {
        mockMvc.perform(options("/api/foods")
                        .header("Origin", "http://localhost:8081")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8081"));
    }

    @Test
    void foodCrudWorksForAuthenticatedOwner() throws Exception {
        MvcResult registration = register("Food Owner", "owner@kaipool.nz")
                .andExpect(status().isCreated())
                .andReturn();
        String token = JsonPath.read(registration.getResponse().getContentAsString(), "$.token");

        MvcResult created = mockMvc.perform(post("/api/foods")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Kūmara","quantity":"4","availability":"PRIVATE"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Kūmara"))
                .andReturn();
        Number foodId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/api/foods").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(foodId.longValue()));

        mockMvc.perform(put("/api/foods/{id}", foodId.longValue())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Kūmara","quantity":"2","availability":"GIVEAWAY"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availability").value("GIVEAWAY"));

        mockMvc.perform(delete("/api/foods/{id}", foodId.longValue())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void foodQuantityIsOptional() throws Exception {
        MvcResult registration = register("Food Owner", "optional-quantity@kaipool.nz")
                .andExpect(status().isCreated())
                .andReturn();
        String token = JsonPath.read(registration.getResponse().getContentAsString(), "$.token");

        mockMvc.perform(post("/api/foods")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Apples","imageUrl":"https://example.com/apples.jpg","availability":"PRIVATE"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.quantity").doesNotExist())
                .andExpect(jsonPath("$.imageUrl").value("https://example.com/apples.jpg"));
    }

    @Test
    void userCannotDeleteAnotherUsersFood() throws Exception {
        MvcResult ownerRegistration = register("Owner", "owner@kaipool.nz")
                .andExpect(status().isCreated())
                .andReturn();
        String ownerToken = JsonPath.read(ownerRegistration.getResponse().getContentAsString(), "$.token");

        MvcResult created = mockMvc.perform(post("/api/foods")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Bread","quantity":"1 loaf","availability":"PRIVATE"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        Number foodId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        MvcResult otherRegistration = register("Other User", "other@kaipool.nz")
                .andExpect(status().isCreated())
                .andReturn();
        String otherToken = JsonPath.read(otherRegistration.getResponse().getContentAsString(), "$.token");

        mockMvc.perform(delete("/api/foods/{id}", foodId.longValue())
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void giveawayCanBeBrowsedClaimedOnceAndFoundInMyClaims() throws Exception {
        RegisteredUser owner = registerUser("Giveaway Owner", "giveaway-owner@kaipool.nz");
        RegisteredUser claimant = registerUser("Claimant", "claimant@kaipool.nz");
        RegisteredUser secondClaimant = registerUser("Second Claimant", "second-claimant@kaipool.nz");
        completeProfile(owner, -36.990, 174.860, "Māori");
        completeProfile(claimant, -36.985, 174.865, "Samoan");
        completeProfile(secondClaimant, -36.984, 174.866, "Tongan");

        long giveawayId = addFood(owner, "Fresh lemons", "6", "GIVEAWAY");
        addFood(owner, "Private rice", "1 bag", "PRIVATE");
        addFood(owner, "Shared chicken", "1 kg", "COOK_TOGETHER");

        mockMvc.perform(get("/api/foods/marketplace")
                        .header("Authorization", "Bearer " + claimant.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(giveawayId))
                .andExpect(jsonPath("$[0].name").value("Fresh lemons"))
                .andExpect(jsonPath("$[0].ownerName").value("Giveaway Owner"))
                .andExpect(jsonPath("$[0].ownerLatitude").value(-36.99))
                .andExpect(jsonPath("$[0].ownerLongitude").value(174.86))
                .andExpect(jsonPath("$[0].distanceKm").isNumber());

        mockMvc.perform(post("/api/foods/marketplace/{id}/claim", giveawayId)
                        .header("Authorization", "Bearer " + claimant.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimedAt").isNotEmpty());

        mockMvc.perform(get("/api/foods/marketplace")
                        .header("Authorization", "Bearer " + secondClaimant.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(post("/api/foods/marketplace/{id}/claim", giveawayId)
                        .header("Authorization", "Bearer " + secondClaimant.token()))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/foods/marketplace/claimed")
                        .header("Authorization", "Bearer " + claimant.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(giveawayId))
                .andExpect(jsonPath("$[0].claimedAt").isNotEmpty());
    }

    @Test
    void marketplaceExcludesOwnAndDistantGiveaways() throws Exception {
        RegisteredUser viewer = registerUser("Viewer", "market-viewer@kaipool.nz");
        RegisteredUser nearbyOwner = registerUser("Nearby", "nearby-owner@kaipool.nz");
        RegisteredUser distantOwner = registerUser("Distant", "distant-owner@kaipool.nz");
        completeProfile(viewer, -36.990, 174.860, "Māori");
        completeProfile(nearbyOwner, -36.980, 174.870, "Samoan");
        completeProfile(distantOwner, -37.500, 174.860, "Tongan");
        addFood(viewer, "My apples", "4", "GIVEAWAY");
        long nearbyId = addFood(nearbyOwner, "Nearby bread", "1 loaf", "GIVEAWAY");
        addFood(distantOwner, "Distant milk", "1 bottle", "GIVEAWAY");

        mockMvc.perform(get("/api/foods/marketplace")
                        .header("Authorization", "Bearer " + viewer.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(nearbyId));
    }

    @Test
    void nearbyUsersAreRankedByComplementaryCookTogetherFood() throws Exception {
        RegisteredUser chef = registerUser("Chef", "chef@kaipool.nz");
        RegisteredUser strongMatch = registerUser("Strong Match", "strong@kaipool.nz");
        RegisteredUser weakerMatch = registerUser("Weaker Match", "weaker@kaipool.nz");
        RegisteredUser farMatch = registerUser("Far Match", "far@kaipool.nz");

        completeProfile(chef, -36.99, 174.86, "Chinese");
        completeProfile(strongMatch, -36.98, 174.87, "Chinese");
        completeProfile(weakerMatch, -36.97, 174.88, "Italian");
        completeProfile(farMatch, -37.50, 174.86, "Chinese");

        addFood(chef, "Chicken", "1 kg", "COOK_TOGETHER");
        addFood(chef, "Carrots", "4", "PRIVATE");
        addFood(strongMatch, "Rice", "2 cups", "COOK_TOGETHER");
        addFood(strongMatch, "Eggs", "6", "COOK_TOGETHER");
        addFood(weakerMatch, "Rice", "1 cup", "COOK_TOGETHER");
        addFood(farMatch, "Rice", "1 cup", "COOK_TOGETHER");
        addFood(farMatch, "Eggs", "4", "COOK_TOGETHER");

        mockMvc.perform(get("/api/matches").header("Authorization", "Bearer " + chef.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].matchedUserId").value(strongMatch.id()))
                .andExpect(jsonPath("$[0].matchedUserName").value("Strong Match"))
                .andExpect(jsonPath("$[0].matchScore").isNumber())
                .andExpect(jsonPath("$[0].matchReason").value(org.hamcrest.Matchers.containsString("Chicken fried rice")))
                .andExpect(jsonPath("$[0].yourContributions.length()").value(1))
                .andExpect(jsonPath("$[0].yourContributions[0].name").value("Chicken"))
                .andExpect(jsonPath("$[0].theirContributions.length()").value(
                        org.hamcrest.Matchers.greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$[0].possibleMeals[0].mealName").value("Chicken fried rice"))
                .andExpect(jsonPath("$[0].possibleMeals[0].description").isNotEmpty())
                .andExpect(jsonPath("$[0].possibleMeals[0].imageUrl").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$[0].possibleMeals[0].imageAttribution").value(org.hamcrest.Matchers.nullValue()));

        mockMvc.perform(get("/api/matches/{id}", strongMatch.id())
                        .header("Authorization", "Bearer " + chef.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedUserId").value(strongMatch.id()))
                .andExpect(jsonPath("$.possibleMeals[0].description").isNotEmpty());
    }

    @Test
    void collaborativeRecipeReturnsTheSameMealSelectedForTheMatch() throws Exception {
        RegisteredUser chef = registerUser("Chef", "recipes-chef@kaipool.nz");
        RegisteredUser friend = registerUser("Friend", "recipes-friend@kaipool.nz");
        completeProfile(chef, -36.99, 174.86, "Chinese");
        completeProfile(friend, -36.98, 174.87, "Italian");
        addFood(chef, "Chicken", "1 kg", "COOK_TOGETHER");
        addFood(friend, "Rice", "2 cups", "COOK_TOGETHER");
        addFood(friend, "Eggs", "6", "COOK_TOGETHER");

        mockMvc.perform(post("/api/matches/{id}/recipes", friend.id())
                        .header("Authorization", "Bearer " + chef.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].mealName").isNotEmpty())
                .andExpect(jsonPath("$[0].description").isNotEmpty())
                .andExpect(jsonPath("$[0].culturalOriginOrInspiration").isNotEmpty())
                .andExpect(jsonPath("$[0].ingredientsFromYou[0]").value("Chicken"))
                .andExpect(jsonPath("$[0].ingredientsFromThem").isArray())
                .andExpect(jsonPath("$[0].cookingInstructions.length()").value(3))
                .andExpect(jsonPath("$[0].imageUrl").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$[0].imageAttribution").value(org.hamcrest.Matchers.nullValue()));

        mockMvc.perform(post("/api/matches/{id}/recipes", chef.id())
                        .header("Authorization", "Bearer " + friend.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].ingredientsFromYou[0]").value("Rice"))
                .andExpect(jsonPath("$[0].ingredientsFromThem[0]").value("Chicken"));

        org.assertj.core.api.Assertions.assertThat(collaborativeRecipeCacheRepository.count()).isEqualTo(1);
    }

    @Test
    void generatedMealImagesCanBeServedFromThePersistentImageCache() throws Exception {
        String path = mealImageAssetService.store("Test meal", "image/png", new byte[] { 1, 2, 3, 4 });

        mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("max-age")))
                .andExpect(content().bytes(new byte[] { 1, 2, 3, 4 }));
    }

    @Test
    void recipesCannotBeGeneratedForAUserWhoIsNotAValidNearbyMatch() throws Exception {
        RegisteredUser chef = registerUser("Chef", "invalid-chef@kaipool.nz");
        RegisteredUser privateUser = registerUser("Private User", "private@kaipool.nz");
        completeProfile(chef, -36.99, 174.86, "Chinese");
        completeProfile(privateUser, -36.98, 174.87, "Chinese");
        addFood(chef, "Chicken", "1 kg", "COOK_TOGETHER");
        addFood(privateUser, "Rice", "2 cups", "PRIVATE");

        mockMvc.perform(post("/api/matches/{id}/recipes", privateUser.id())
                        .header("Authorization", "Bearer " + chef.token()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Cooking match not found"));
    }

    private RegisteredUser registerUser(String name, String email) throws Exception {
        MvcResult result = register(name, email).andExpect(status().isCreated()).andReturn();
        String json = result.getResponse().getContentAsString();
        return new RegisteredUser(JsonPath.read(json, "$.token"), ((Number) JsonPath.read(json, "$.user.id")).longValue(), name);
    }

    private void completeProfile(RegisteredUser user, double latitude, double longitude, String culture) throws Exception {
        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"%s",
                                  "latitude":%s,
                                  "longitude":%s,
                                  "foodCultures":["%s"],
                                  "foodCulturesToExplore":[],
                                  "onboardingCompleted":true
                                }
                                """.formatted(user.name(), latitude, longitude, culture)))
                .andExpect(status().isOk());
    }

    private long addFood(RegisteredUser user, String name, String quantity, String availability) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/foods")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","quantity":"%s","availability":"%s"}
                                """.formatted(name, quantity, availability)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    @Test
    void usersCanRequestAcceptAndArrangeACookingConnection() throws Exception {
        RegisteredUser requester = registerUser("Requesting Cook", "requesting-cook@kaipool.nz");
        RegisteredUser recipient = registerUser("Receiving Cook", "receiving-cook@kaipool.nz");
        RegisteredUser stranger = registerUser("Stranger", "connection-stranger@kaipool.nz");
        completeProfile(requester, -36.990, 174.860, "Chinese");
        completeProfile(recipient, -36.980, 174.870, "Italian");
        completeProfile(stranger, -36.970, 174.880, "Māori");
        addFood(requester, "Chicken", "1 kg", "COOK_TOGETHER");
        addFood(recipient, "Rice", "2 cups", "COOK_TOGETHER");
        addFood(stranger, "Eggs", "6", "COOK_TOGETHER");

        MvcResult requested = mockMvc.perform(post("/api/cooking-connections/requests/{id}", recipient.id())
                        .header("Authorization", "Bearer " + requester.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.incoming").value(false))
                .andExpect(jsonPath("$.contactEmail").doesNotExist())
                .andReturn();
        long connectionId = ((Number) JsonPath.read(
                requested.getResponse().getContentAsString(), "$.id")).longValue();

        entityManager.clear();

        mockMvc.perform(put("/api/cooking-connections/{id}/response", connectionId)
                        .header("Authorization", "Bearer " + requester.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACCEPTED\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/cooking-connections")
                        .header("Authorization", "Bearer " + recipient.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].incoming").value(true))
                .andExpect(jsonPath("$[0].otherUserName").value("Requesting Cook"));

        mockMvc.perform(put("/api/cooking-connections/{id}/response", connectionId)
                        .header("Authorization", "Bearer " + recipient.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACCEPTED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.contactEmail").value("requesting-cook@kaipool.nz"));

        mockMvc.perform(put("/api/cooking-connections/{id}/arrangement", connectionId)
                        .header("Authorization", "Bearer " + requester.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "meetingPlace":"Ōtara Community Kitchen",
                                  "meetingTime":"Saturday at 11:00 am",
                                  "meetingNote":"Bring a container for leftovers"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meetingPlace").value("Ōtara Community Kitchen"))
                .andExpect(jsonPath("$.meetingTime").value("Saturday at 11:00 am"));

        mockMvc.perform(get("/api/cooking-connections/{id}", connectionId)
                        .header("Authorization", "Bearer " + stranger.token()))
                .andExpect(status().isForbidden());
    }

    @Test
    void cookingRequestCanBeDeclinedAndContactDetailsStayPrivate() throws Exception {
        RegisteredUser requester = registerUser("Declined Requester", "declined-requester@kaipool.nz");
        RegisteredUser recipient = registerUser("Declining Cook", "declining-cook@kaipool.nz");
        completeProfile(requester, -36.990, 174.860, "Chinese");
        completeProfile(recipient, -36.980, 174.870, "Italian");
        addFood(requester, "Chicken", "1 kg", "COOK_TOGETHER");
        addFood(recipient, "Rice", "2 cups", "COOK_TOGETHER");

        MvcResult requested = mockMvc.perform(post("/api/cooking-connections/requests/{id}", recipient.id())
                        .header("Authorization", "Bearer " + requester.token()))
                .andExpect(status().isOk())
                .andReturn();
        long connectionId = ((Number) JsonPath.read(
                requested.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc.perform(put("/api/cooking-connections/{id}/response", connectionId)
                        .header("Authorization", "Bearer " + recipient.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DECLINED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DECLINED"))
                .andExpect(jsonPath("$.contactEmail").doesNotExist());
    }

    private ResultActions register(String name, String email) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"%s","email":"%s","password":"password123"}
                        """.formatted(name, email)));
    }

    private record RegisteredUser(String token, long id, String name) {
    }
}
