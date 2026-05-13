package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class StoreIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: POST /api/stores — admin creates a store
    // -------------------------------------------------------------------------

    @Test
    void should_create_store_as_admin() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);
        String uniqueName = "New Store " + UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(post("/api/stores")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "address": "123 Test Street",
                                  "baseCashAmount": 103.00
                                }
                                """.formatted(uniqueName)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Store created successfully"))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.name").value(uniqueName))
                .andExpect(jsonPath("$.data.address").value("123 Test Street"))
                .andExpect(jsonPath("$.data.baseCashAmount").value(103.00))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.deactivatedById").doesNotExist())
                .andExpect(jsonPath("$.data.deactivatedAt").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Test 2: GET /api/stores — authenticated user lists stores
    // -------------------------------------------------------------------------

    @Test
    void should_list_stores_as_authenticated_user() throws Exception {
        // Arrange
        Store storeA = createStore();
        Store storeB = createStore();
        User staff = createStaff(storeA);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/stores")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Stores retrieved successfully"))
                .andExpect(jsonPath("$.data[?(@.id == '" + storeA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + storeB.getId() + "')]").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 3: GET /api/stores/{id} — authenticated user gets store by id
    // -------------------------------------------------------------------------

    @Test
    void should_get_store_by_id() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/stores/{id}", store.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Store retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.name").value(store.getName()))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    // -------------------------------------------------------------------------
    // Test 4: PATCH /api/stores/{id} — admin updates a store
    // -------------------------------------------------------------------------

    @Test
    void should_update_store_as_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(patch("/api/stores/{id}", store.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "  Updated Store Name  ",
                                  "address": "Updated Address",
                                  "baseCashAmount": 150.00
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Store updated successfully"))
                .andExpect(jsonPath("$.data.id").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.name").value("Updated Store Name"))
                .andExpect(jsonPath("$.data.address").value("Updated Address"))
                .andExpect(jsonPath("$.data.baseCashAmount").value(150.00));
    }

    // -------------------------------------------------------------------------
    // Test 5: PATCH /api/stores/{id} — staff cannot update a store
    // -------------------------------------------------------------------------

    @Test
    void should_reject_update_store_as_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(patch("/api/stores/{id}", store.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Rejected Update",
                                  "address": "Some Address",
                                  "baseCashAmount": 103.00
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Test 6: GET /api/stores?search= — filters stores by unique search term
    // -------------------------------------------------------------------------

    @Test
    void should_filter_stores_by_search_term() throws Exception {
        // Arrange — store with a highly unique searchable name
        String uniqueMarker = "AlphaSearch-" + UUID.randomUUID();
        Store searchableStore = createStoreWithName(uniqueMarker);
        Store unrelatedStore = createStore();
        User staff = createStaff(searchableStore);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/stores")
                        .param("search", uniqueMarker)
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.id == '" + searchableStore.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + unrelatedStore.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 7: GET /api/stores?includeInactive=true — admin sees inactive stores
    // -------------------------------------------------------------------------

    @Test
    void should_include_inactive_stores_when_include_inactive_is_true() throws Exception {
        // Arrange
        User admin = createAdmin();
        Store store = createStore();
        String adminToken = jwtService.generateAccessToken(admin);

        // Deactivate via HTTP (sets deactivatedBy = admin — the real production path)
        mockMvc.perform(patch("/api/stores/{id}/deactivate", store.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Act + Assert — inactive store must appear with includeInactive=true
        mockMvc.perform(get("/api/stores")
                        .param("includeInactive", "true")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.id == '" + store.getId() + "' && @.active == false)]").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // Helper: create store with specific name
    // -------------------------------------------------------------------------

    private Store createStoreWithName(String name) {
        java.time.Instant now = java.time.Instant.now();
        com.shiftcontrol.backend.stores.model.Store store = new com.shiftcontrol.backend.stores.model.Store();
        store.setName(name);
        store.setAddress("Test Address");
        store.setBaseCashAmount(new java.math.BigDecimal("103.00"));
        store.setActive(true);
        store.setCreatedAt(now);
        store.setUpdatedAt(now);
        return storeRepository.save(store);
    }
}
