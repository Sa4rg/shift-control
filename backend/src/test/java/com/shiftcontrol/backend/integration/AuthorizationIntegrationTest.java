package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.sales.model.InvoiceStatus;
import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.sales.repository.SaleRepository;
import com.shiftcontrol.backend.shared.security.JwtService;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.model.ShiftType;
import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthorizationIntegrationTest extends IntegrationTestBase {

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private JwtService jwtService;

    // -------------------------------------------------------------------------
    // Test 1: STAFF cannot create a store
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_create_store() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);
        String uniqueName = "New Store " + UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(post("/api/stores")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "address": "Test Address",
                                  "baseCashAmount": 103.00
                                }
                                """.formatted(uniqueName)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Test 2: ADMIN can create a store
    // -------------------------------------------------------------------------

    @Test
    void admin_can_create_store() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);
        String uniqueName = "Admin Store " + UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(post("/api/stores")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "address": "Admin Address",
                                  "baseCashAmount": 103.00
                                }
                                """.formatted(uniqueName)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Store created successfully"))
                .andExpect(jsonPath("$.data.name").value(uniqueName));
    }

    // -------------------------------------------------------------------------
    // Test 3: STAFF cannot access another staff member's sale
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_access_other_staff_sale() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);
        Sale sale = createSale(store, staffA, shiftA);

        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(get("/api/sales/{id}", sale.getId())
                        .header("Authorization", "Bearer " + staffBToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not allowed to access this sale"));
    }

    // -------------------------------------------------------------------------
    // Test 4: STAFF cannot access another staff member's shift
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_access_other_staff_shift() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);

        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(get("/api/shifts/{id}", shiftA.getId())
                        .header("Authorization", "Bearer " + staffBToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not allowed to access this shift"));
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store createStore() {
        Instant now = Instant.now();
        Store store = new Store();
        store.setName("Auth Store " + UUID.randomUUID());
        store.setAddress("Auth Address");
        store.setBaseCashAmount(new BigDecimal("103.00"));
        store.setActive(true);
        store.setCreatedAt(now);
        store.setUpdatedAt(now);
        return storeRepository.save(store);
    }

    private User createAdmin() {
        Instant now = Instant.now();
        User admin = new User();
        admin.setFullName("Auth Admin");
        admin.setUsername("auth.admin." + UUID.randomUUID());
        admin.setEmail(null);
        admin.setPinHash(null);
        admin.setPasswordHash("hashed-password");
        admin.setRole(Role.ADMIN);
        admin.setStore(null);
        admin.setActive(true);
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        return userRepository.save(admin);
    }

    private User createStaff(Store store) {
        Instant now = Instant.now();
        User staff = new User();
        staff.setFullName("Auth Staff");
        staff.setUsername("auth.staff." + UUID.randomUUID());
        staff.setEmail(null);
        staff.setPinHash("hashed-pin");
        staff.setPasswordHash(null);
        staff.setRole(Role.STAFF);
        staff.setStore(store);
        staff.setActive(true);
        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);
        return userRepository.save(staff);
    }

    private Shift createOpenShift(User staff, Store store) {
        Instant now = Instant.now();
        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(store);
        shift.setType(ShiftType.DAY);
        shift.setStatus(ShiftStatus.OPEN);
        shift.setOpenedAt(now);
        shift.setClosedAt(null);
        shift.setClosedBy(null);
        shift.setCreatedAt(now);
        shift.setUpdatedAt(now);
        return shiftRepository.save(shift);
    }

    private Sale createSale(Store store, User staff, Shift shift) {
        Instant now = Instant.now();
        Sale sale = new Sale();
        sale.setStore(store);
        sale.setStaff(staff);
        sale.setShift(shift);
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setInvoiceStatus(InvoiceStatus.PENDING);
        sale.setSubtotalAmount(new BigDecimal("10.00"));
        sale.setDiscountTotalAmount(new BigDecimal("0.00"));
        sale.setFinalTotalAmount(new BigDecimal("10.00"));
        sale.setNote(null);
        sale.setCancelledReason(null);
        sale.setCreatedAt(now);
        sale.setUpdatedAt(now);
        sale.setCancelledAt(null);
        return saleRepository.save(sale);
    }
}
