package nz.ac.aut.kaipool;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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

import nz.ac.aut.kaipool.repository.FoodRepository;
import nz.ac.aut.kaipool.repository.UserRepository;

@SpringBootTest
@ActiveProfiles("test")
class FoundationApiTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private UserRepository userRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
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

    private ResultActions register(String name, String email) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"%s","email":"%s","password":"password123"}
                        """.formatted(name, email)));
    }
}
