package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReview;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReviewStatus;
import com.shiftcontrol.backend.reviews.repository.WeeklyAdminReviewRepository;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
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

    @Autowired private WeeklyAdminReviewRepository weeklyAdminReviewRepository;

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
