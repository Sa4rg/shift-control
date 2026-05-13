package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReview;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReviewStatus;
import com.shiftcontrol.backend.reviews.repository.WeeklyAdminReviewRepository;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MonthlyReportIntegrationTest extends IntegrationTestBase {

    @Autowired private WeeklyAdminReviewRepository weeklyAdminReviewRepository;

    // -------------------------------------------------------------------------
    // Test 1: admin recibe el reporte mensual completo con todos los totales
    // -------------------------------------------------------------------------

    @Test
    void should_return_monthly_report_for_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staffA = createStaff(store, "Monthly StaffA");
        User staffB = createStaff(store, "Monthly StaffB");

        // Staff A — cierre 1 (lunes de la semana 2026-05-04)
        Shift shiftA1 = createClosedShift(staffA, store, admin, Instant.parse("2026-05-04T10:00:00Z"));
        createClosure(shiftA1, admin,
                "40.00", "25.00", "15.00", "10.00",
                "90.00", "25.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        // Staff A — cierre 2 (martes de la misma semana 2026-05-04)
        Shift shiftA2 = createClosedShift(staffA, store, admin, Instant.parse("2026-05-05T10:00:00Z"));
        createClosure(shiftA2, admin,
                "20.00", "30.00", "0.00", "5.00",
                "55.00", "0.00",
                "-3.00", "2.00",
                ClosureStatus.CLOSED_WITH_INCIDENT);

        // Staff B — cierre (semana 2026-05-11)
        Shift shiftB = createClosedShift(staffB, store, admin, Instant.parse("2026-05-12T10:00:00Z"));
        createClosure(shiftB, admin,
                "100.00", "0.00", "0.00", "0.00",
                "100.00", "100.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        // Ventas en mayo — 3 ACTIVE + 1 CANCELLED
        Instant inMay = Instant.parse("2026-05-10T12:00:00Z");
        createSale(store, staffA, shiftA1, SaleStatus.ACTIVE,   inMay);
        createSale(store, staffA, shiftA1, SaleStatus.ACTIVE,   inMay);
        createSale(store, staffB, shiftB,  SaleStatus.ACTIVE,   inMay);
        createSale(store, staffA, shiftA1, SaleStatus.CANCELLED, inMay);

        // Incidentes en mayo
        createIncident(staffA, shiftA1, IncidentStatus.OPEN,     Instant.parse("2026-05-04T12:00:00Z"));
        createIncident(staffA, shiftA2, IncidentStatus.RESOLVED, Instant.parse("2026-05-05T12:00:00Z"));
        createIncident(staffB, shiftB,  IncidentStatus.OPEN,     Instant.parse("2026-05-12T12:00:00Z"));

        // Weekly admin reviews en mayo
        createWeeklyReview(store, staffA, admin,
                LocalDate.of(2026, 5, 4), LocalDate.of(2026, 5, 10),
                WeeklyAdminReviewStatus.REVIEWED_OK);
        createWeeklyReview(store, staffB, admin,
                LocalDate.of(2026, 5, 11), LocalDate.of(2026, 5, 17),
                WeeklyAdminReviewStatus.REVIEWED_WITH_INCIDENT);

        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/monthly")
                        .param("storeId", store.getId().toString())
                        .param("month", "2026-05")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Monthly report retrieved successfully"))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.storeName").value(store.getName()))
                .andExpect(jsonPath("$.data.monthStart").value("2026-05-01"))
                .andExpect(jsonPath("$.data.monthEnd").value("2026-05-31"))
                .andExpect(jsonPath("$.data.totalCash").value(160.0))
                .andExpect(jsonPath("$.data.totalMb").value(55.0))
                .andExpect(jsonPath("$.data.totalGlovoOnline").value(15.0))
                .andExpect(jsonPath("$.data.totalGlovoCash").value(15.0))
                .andExpect(jsonPath("$.data.totalSales").value(245.0))
                .andExpect(jsonPath("$.data.pendingInvoiceTotal").value(125.0))
                .andExpect(jsonPath("$.data.cashDifferenceTotal").value(-3.0))
                .andExpect(jsonPath("$.data.mbDifferenceTotal").value(2.0))
                .andExpect(jsonPath("$.data.closuresCount").value(3))
                .andExpect(jsonPath("$.data.closedOkCount").value(2))
                .andExpect(jsonPath("$.data.closedWithIncidentCount").value(1))
                .andExpect(jsonPath("$.data.activeSalesCount").value(3))
                .andExpect(jsonPath("$.data.cancelledSalesCount").value(1))
                .andExpect(jsonPath("$.data.openIncidentsCount").value(2))
                .andExpect(jsonPath("$.data.resolvedIncidentsCount").value(1))
                .andExpect(jsonPath("$.data.weeklyReviewsCount").value(2))
                .andExpect(jsonPath("$.data.weeklyReviewsOkCount").value(1))
                .andExpect(jsonPath("$.data.weeklyReviewsWithIncidentCount").value(1))
                .andExpect(jsonPath("$.data.staffSummaries.length()").value(2))
                .andExpect(jsonPath("$.data.weekSummaries.length()").value(2));
    }

    // -------------------------------------------------------------------------
    // Test 2: token STAFF es rechazado con 403
    // -------------------------------------------------------------------------

    @Test
    void should_reject_monthly_report_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store, "Monthly Forbidden Staff");
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/monthly")
                        .param("storeId", store.getId().toString())
                        .param("month", "2026-05")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Test 3: storeId inexistente → 404
    // -------------------------------------------------------------------------

    @Test
    void should_return_not_found_when_store_does_not_exist() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);
        UUID unknownStoreId = UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/monthly")
                        .param("storeId", unknownStoreId.toString())
                        .param("month", "2026-05")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Store not found"));
    }

    // -------------------------------------------------------------------------
    // Test 4: datos fuera del mes solicitado no se incluyen en el reporte
    // -------------------------------------------------------------------------

    @Test
    void should_exclude_data_outside_requested_month() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store, "Monthly Boundary Staff");

        // Cierre dentro de mayo
        Shift shiftInMay = createClosedShift(staff, store, admin, Instant.parse("2026-05-15T10:00:00Z"));
        createClosure(shiftInMay, admin,
                "100.00", "0.00", "0.00", "0.00",
                "100.00", "0.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        // Cierre fuera de mayo (1 de junio)
        Shift shiftOutside = createClosedShift(staff, store, admin, Instant.parse("2026-06-01T10:00:00Z"));
        createClosure(shiftOutside, admin,
                "999.00", "0.00", "0.00", "0.00",
                "999.00", "0.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/monthly")
                        .param("storeId", store.getId().toString())
                        .param("month", "2026-05")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSales").value(100.0))
                .andExpect(jsonPath("$.data.closuresCount").value(1));
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private WeeklyAdminReview createWeeklyReview(
            Store store,
            User staff,
            User reviewedBy,
            LocalDate weekStart,
            LocalDate weekEnd,
            WeeklyAdminReviewStatus status
    ) {
        Instant now = Instant.now();
        WeeklyAdminReview review = new WeeklyAdminReview();
        review.setStore(store);
        review.setStaff(staff);
        review.setReviewedBy(reviewedBy);
        review.setWeekStart(weekStart);
        review.setWeekEnd(weekEnd);
        review.setTotalCash(new BigDecimal("0.00"));
        review.setTotalMb(new BigDecimal("0.00"));
        review.setTotalGlovoOnline(new BigDecimal("0.00"));
        review.setTotalGlovoCash(new BigDecimal("0.00"));
        review.setTotalSales(new BigDecimal("0.00"));
        review.setPendingInvoiceTotal(new BigDecimal("0.00"));
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
