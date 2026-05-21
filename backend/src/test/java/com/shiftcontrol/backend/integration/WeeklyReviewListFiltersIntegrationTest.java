package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.reviews.model.WeeklyAdminReview;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReviewStatus;
import com.shiftcontrol.backend.reviews.repository.WeeklyAdminReviewRepository;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WeeklyReviewListFiltersIntegrationTest extends IntegrationTestBase {

    @Autowired
    private WeeklyAdminReviewRepository weeklyAdminReviewRepository;

    // -------------------------------------------------------------------------
    // Test 1: no filters preserve existing behavior
    // -------------------------------------------------------------------------

    @Test
    void no_filters_preserve_existing_weekly_reviews_behavior() throws Exception {
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);
        createReviewDirectly(store, staff, admin, LocalDate.of(2025, 1, 6), WeeklyAdminReviewStatus.REVIEWED_OK);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/admin/weekly-reviews")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    // -------------------------------------------------------------------------
    // Test 2: admin can filter reviews by storeId
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_weekly_reviews_by_store() throws Exception {
        Store storeA = createStore();
        Store storeB = createStore();
        User admin = createAdmin();
        User staffA = createStaff(storeA);
        User staffB = createStaff(storeB);
        WeeklyAdminReview reviewA = createReviewDirectly(storeA, staffA, admin,
                LocalDate.of(2025, 1, 6), WeeklyAdminReviewStatus.REVIEWED_OK);
        WeeklyAdminReview reviewB = createReviewDirectly(storeB, staffB, admin,
                LocalDate.of(2025, 1, 6), WeeklyAdminReviewStatus.REVIEWED_OK);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/admin/weekly-reviews")
                        .param("storeId", storeA.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + reviewA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + reviewB.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 3: admin can filter reviews by staffId
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_weekly_reviews_by_staff() throws Exception {
        Store store = createStore();
        User admin = createAdmin();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        WeeklyAdminReview reviewA = createReviewDirectly(store, staffA, admin,
                LocalDate.of(2025, 1, 6), WeeklyAdminReviewStatus.REVIEWED_OK);
        WeeklyAdminReview reviewB = createReviewDirectly(store, staffB, admin,
                LocalDate.of(2025, 1, 13), WeeklyAdminReviewStatus.REVIEWED_OK);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/admin/weekly-reviews")
                        .param("staffId", staffA.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + reviewA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + reviewB.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 4: admin can filter reviews by weekStart
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_weekly_reviews_by_week_start() throws Exception {
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);
        WeeklyAdminReview reviewWeek1 = createReviewDirectly(store, staff, admin,
                LocalDate.of(2025, 1, 6), WeeklyAdminReviewStatus.REVIEWED_OK);
        WeeklyAdminReview reviewWeek2 = createReviewDirectly(store, staff, admin,
                LocalDate.of(2025, 1, 13), WeeklyAdminReviewStatus.REVIEWED_OK);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/admin/weekly-reviews")
                        .param("weekStart", "2025-01-06")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + reviewWeek1.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + reviewWeek2.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 5: admin can filter reviews by status
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_weekly_reviews_by_status() throws Exception {
        Store store = createStore();
        User admin = createAdmin();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        WeeklyAdminReview okReview = createReviewDirectly(store, staffA, admin,
                LocalDate.of(2025, 1, 6), WeeklyAdminReviewStatus.REVIEWED_OK);
        WeeklyAdminReview incidentReview = createReviewDirectly(store, staffB, admin,
                LocalDate.of(2025, 1, 6), WeeklyAdminReviewStatus.REVIEWED_WITH_INCIDENT);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/admin/weekly-reviews")
                        .param("status", "REVIEWED_OK")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + okReview.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentReview.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 6: admin can combine multiple filters
    // -------------------------------------------------------------------------

    @Test
    void admin_can_combine_weekly_review_filters() throws Exception {
        Store storeA = createStore();
        Store storeB = createStore();
        User admin = createAdmin();
        User staffA = createStaff(storeA);
        User staffB = createStaff(storeB);
        WeeklyAdminReview reviewA = createReviewDirectly(storeA, staffA, admin,
                LocalDate.of(2025, 1, 6), WeeklyAdminReviewStatus.REVIEWED_OK);
        WeeklyAdminReview reviewB = createReviewDirectly(storeB, staffB, admin,
                LocalDate.of(2025, 1, 6), WeeklyAdminReviewStatus.REVIEWED_OK);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/admin/weekly-reviews")
                        .param("storeId", storeA.getId().toString())
                        .param("status", "REVIEWED_OK")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + reviewA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + reviewB.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 7: staff cannot access weekly reviews
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_access_weekly_reviews_still_forbidden() throws Exception {
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        mockMvc.perform(get("/api/admin/weekly-reviews")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private WeeklyAdminReview createReviewDirectly(
            Store store, User staff, User reviewedBy,
            LocalDate weekStart, WeeklyAdminReviewStatus status
    ) {
        Instant now = Instant.now();
        WeeklyAdminReview review = new WeeklyAdminReview();
        review.setStore(store);
        review.setStaff(staff);
        review.setReviewedBy(reviewedBy);
        review.setWeekStart(weekStart);
        review.setWeekEnd(weekStart.plusDays(6));
        review.setTotalCash(new BigDecimal("50.00"));
        review.setTotalMb(new BigDecimal("30.00"));
        review.setTotalGlovoOnline(new BigDecimal("10.00"));
        review.setTotalGlovoCash(new BigDecimal("5.00"));
        review.setTotalSales(new BigDecimal("95.00"));
        review.setPendingInvoiceTotal(new BigDecimal("10.00"));
        review.setCashDifferenceTotal(new BigDecimal("0.00"));
        review.setMbDifferenceTotal(new BigDecimal("0.00"));
        review.setClosuresCount(1);
        review.setIncidentCount(0);
        review.setStatus(status);
        review.setNote(null);
        review.setCreatedAt(now);
        review.setUpdatedAt(now);
        return weeklyAdminReviewRepository.save(review);
    }
}
