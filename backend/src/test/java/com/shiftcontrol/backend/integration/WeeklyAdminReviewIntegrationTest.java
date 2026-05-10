package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReview;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReviewStatus;
import com.shiftcontrol.backend.reviews.repository.WeeklyAdminReviewRepository;
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
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WeeklyAdminReviewIntegrationTest extends IntegrationTestBase {

    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ShiftRepository shiftRepository;
    @Autowired private ShiftClosureRepository shiftClosureRepository;
    @Autowired private WeeklyAdminReviewRepository weeklyAdminReviewRepository;
    @Autowired private JwtService jwtService;

    private static final LocalDate WEEK_START = LocalDate.of(2026, 5, 4);

    // -------------------------------------------------------------------------
    // Test 1: admin crea review y recibe snapshot con los totales del cierre
    // -------------------------------------------------------------------------

    @Test
    void should_create_weekly_admin_review_as_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);

        Shift shift = createClosedShift(staff, store, admin, Instant.parse("2026-05-05T10:00:00Z"));
        createClosure(shift, admin,
                "40.00", "25.00", "15.00", "10.00",
                "90.00", "25.00",
                "50.00", "153.00", "153.00", "25.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        String adminToken = jwtService.generateAccessToken(admin);
        String body = buildRequestBody(store.getId(), staff.getId(), WEEK_START, "REVIEWED_OK", "  Reviewed, all good  ");

        // Act + Assert
        mockMvc.perform(post("/api/admin/weekly-reviews")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Weekly admin review created successfully"))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.staffId").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.reviewedById").value(admin.getId().toString()))
                .andExpect(jsonPath("$.data.weekStart").value("2026-05-04"))
                .andExpect(jsonPath("$.data.weekEnd").value("2026-05-10"))
                .andExpect(jsonPath("$.data.totalCash").value(40.0))
                .andExpect(jsonPath("$.data.totalMb").value(25.0))
                .andExpect(jsonPath("$.data.totalGlovoOnline").value(15.0))
                .andExpect(jsonPath("$.data.totalGlovoCash").value(10.0))
                .andExpect(jsonPath("$.data.totalSales").value(90.0))
                .andExpect(jsonPath("$.data.pendingInvoiceTotal").value(25.0))
                .andExpect(jsonPath("$.data.cashDifferenceTotal").value(0.0))
                .andExpect(jsonPath("$.data.mbDifferenceTotal").value(0.0))
                .andExpect(jsonPath("$.data.closuresCount").value(1))
                .andExpect(jsonPath("$.data.status").value("REVIEWED_OK"))
                .andExpect(jsonPath("$.data.note").value("Reviewed, all good"));

        // Verificar persistencia en base de datos
        assertThat(weeklyAdminReviewRepository.existsByStoreAndStaffAndWeekStart(store, staff, WEEK_START))
                .isTrue();
    }

    // -------------------------------------------------------------------------
    // Test 2: token de STAFF es rechazado con 403
    // -------------------------------------------------------------------------

    @Test
    void should_reject_weekly_admin_review_for_staff_token() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);
        String body = buildRequestBody(store.getId(), staff.getId(), WEEK_START, "REVIEWED_OK", null);

        // Act + Assert
        mockMvc.perform(post("/api/admin/weekly-reviews")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Test 3: segunda solicitud idéntica → 400 por duplicado
    // -------------------------------------------------------------------------

    @Test
    void should_reject_duplicate_weekly_admin_review() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);

        Shift shift = createClosedShift(staff, store, admin, Instant.parse("2026-05-05T10:00:00Z"));
        createClosure(shift, admin,
                "40.00", "25.00", "15.00", "10.00",
                "90.00", "25.00",
                "50.00", "153.00", "153.00", "25.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        String adminToken = jwtService.generateAccessToken(admin);
        String body = buildRequestBody(store.getId(), staff.getId(), WEEK_START, "REVIEWED_OK", null);

        // Primera solicitud — debe tener éxito
        mockMvc.perform(post("/api/admin/weekly-reviews")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // Act — segunda solicitud idéntica
        mockMvc.perform(post("/api/admin/weekly-reviews")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Weekly review already exists for staff and week"));
    }

    // -------------------------------------------------------------------------
    // Test 4: sin cierres para ese staff en esa semana → 400
    // -------------------------------------------------------------------------

    @Test
    void should_reject_review_when_staff_has_no_weekly_closure_summary() throws Exception {
        // Arrange — staff existe pero no tiene cierres en la semana solicitada
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);
        String adminToken = jwtService.generateAccessToken(admin);
        String body = buildRequestBody(store.getId(), staff.getId(), WEEK_START, "REVIEWED_OK", null);

        // Act + Assert
        mockMvc.perform(post("/api/admin/weekly-reviews")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("No weekly closure summary found for staff"));
    }

    // -------------------------------------------------------------------------
    // Test 5: admin lista todas las reviews
    // -------------------------------------------------------------------------

    @Test
    void should_list_weekly_admin_reviews_as_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);

        WeeklyAdminReview review = createReviewDirectly(store, staff, admin);

        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/weekly-reviews")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Weekly admin reviews retrieved successfully"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[?(@.id == '%s')]", review.getId().toString()).exists());
    }

    // -------------------------------------------------------------------------
    // Test 6: admin obtiene review por id
    // -------------------------------------------------------------------------

    @Test
    void should_get_weekly_admin_review_by_id_as_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);

        WeeklyAdminReview review = createReviewDirectly(store, staff, admin);

        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/weekly-reviews/{id}", review.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Weekly admin review retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(review.getId().toString()))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.staffId").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.reviewedById").value(admin.getId().toString()));
    }

    // -------------------------------------------------------------------------
    // Test 7: id inexistente → 404
    // -------------------------------------------------------------------------

    @Test
    void should_return_not_found_when_weekly_admin_review_does_not_exist() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);
        UUID unknownId = UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(get("/api/admin/weekly-reviews/{id}", unknownId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Weekly admin review not found"));
    }

    // -------------------------------------------------------------------------
    // Test 8: token de STAFF rechazado en GET lista → 403
    // -------------------------------------------------------------------------

    @Test
    void should_reject_weekly_admin_review_list_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/admin/weekly-reviews")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private WeeklyAdminReview createReviewDirectly(Store store, User staff, User reviewedBy) {
        Instant now = Instant.now();
        WeeklyAdminReview review = new WeeklyAdminReview();
        review.setStore(store);
        review.setStaff(staff);
        review.setReviewedBy(reviewedBy);
        review.setWeekStart(LocalDate.of(2026, 5, 4));
        review.setWeekEnd(LocalDate.of(2026, 5, 10));
        review.setTotalCash(new BigDecimal("40.00"));
        review.setTotalMb(new BigDecimal("25.00"));
        review.setTotalGlovoOnline(new BigDecimal("15.00"));
        review.setTotalGlovoCash(new BigDecimal("10.00"));
        review.setTotalSales(new BigDecimal("90.00"));
        review.setPendingInvoiceTotal(new BigDecimal("25.00"));
        review.setCashDifferenceTotal(new BigDecimal("0.00"));
        review.setMbDifferenceTotal(new BigDecimal("0.00"));
        review.setClosuresCount(1);
        review.setIncidentCount(0);
        review.setStatus(WeeklyAdminReviewStatus.REVIEWED_OK);
        review.setNote("Direct review");
        review.setCreatedAt(now);
        review.setUpdatedAt(now);
        return weeklyAdminReviewRepository.save(review);
    }

    private Store createStore() {
        Instant now = Instant.now();
        Store store = new Store();
        store.setName("Review Integration Store " + UUID.randomUUID());
        store.setAddress("Test Address");
        store.setBaseCashAmount(new BigDecimal("103.00"));
        store.setActive(true);
        store.setCreatedAt(now);
        store.setUpdatedAt(now);
        return storeRepository.save(store);
    }

    private User createAdmin() {
        Instant now = Instant.now();
        User admin = new User();
        admin.setFullName("Review Integration Admin");
        admin.setUsername("rev.admin." + UUID.randomUUID());
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
        staff.setFullName("Review Integration Staff");
        staff.setUsername("rev.staff." + UUID.randomUUID());
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

    private Shift createClosedShift(User staff, Store store, User closedBy, Instant closedAt) {
        Instant now = Instant.now();
        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(store);
        shift.setType(ShiftType.DAY);
        shift.setStatus(ShiftStatus.CLOSED);
        shift.setOpenedAt(closedAt.minusSeconds(3600));
        shift.setClosedAt(closedAt);
        shift.setClosedBy(closedBy);
        shift.setCreatedAt(now);
        shift.setUpdatedAt(now);
        return shiftRepository.save(shift);
    }

    private ShiftClosure createClosure(
            Shift shift,
            User closedBy,
            String totalCash,
            String totalMb,
            String totalGlovoOnline,
            String totalGlovoCash,
            String totalSales,
            String pendingInvoiceTotal,
            String cashToWithdraw,
            String expectedPhysicalCash,
            String confirmedCashAmount,
            String confirmedMbAmount,
            String cashDifference,
            String mbDifference,
            ClosureStatus status
    ) {
        Instant now = Instant.now();
        ShiftClosure closure = new ShiftClosure();
        closure.setShift(shift);
        closure.setClosedBy(closedBy);
        closure.setTotalCash(new BigDecimal(totalCash));
        closure.setTotalMb(new BigDecimal(totalMb));
        closure.setTotalGlovoOnline(new BigDecimal(totalGlovoOnline));
        closure.setTotalGlovoCash(new BigDecimal(totalGlovoCash));
        closure.setTotalSales(new BigDecimal(totalSales));
        closure.setPendingInvoiceTotal(new BigDecimal(pendingInvoiceTotal));
        closure.setCashToWithdraw(new BigDecimal(cashToWithdraw));
        closure.setExpectedPhysicalCash(new BigDecimal(expectedPhysicalCash));
        closure.setConfirmedCashAmount(new BigDecimal(confirmedCashAmount));
        closure.setConfirmedMbAmount(new BigDecimal(confirmedMbAmount));
        closure.setCashDifference(new BigDecimal(cashDifference));
        closure.setMbDifference(new BigDecimal(mbDifference));
        closure.setStatus(status);
        closure.setNote(null);
        closure.setCreatedAt(now);
        closure.setUpdatedAt(now);
        return shiftClosureRepository.save(closure);
    }

    private String buildRequestBody(UUID storeId, UUID staffId, LocalDate weekStart, String status, String note) {
        String noteJson = note == null ? "null" : "\"" + note + "\"";
        return """
                {
                  "storeId": "%s",
                  "staffId": "%s",
                  "weekStart": "%s",
                  "status": "%s",
                  "note": %s
                }
                """.formatted(storeId, staffId, weekStart, status, noteJson);
    }
}
