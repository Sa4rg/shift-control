package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WeeklyReportIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: admin receives weekly report grouped by staff with correct totals
    // -------------------------------------------------------------------------

    @Test
    void should_return_weekly_report_for_admin_grouped_by_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();

        // Staff names must sort alphabetically so the DB ORDER BY fullName ASC
        // guarantees: index 0 = Staff A ("Aaaa…"), index 1 = Staff B ("Bbbb…")
        User staffA = createStaff(store, "Aaaa Weekly StaffA");
        User staffB = createStaff(store, "Bbbb Weekly StaffB");

        // Closed shifts — closedAt must be within [2026-05-04, 2026-05-11)
        Shift shiftA1 = createClosedShift(staffA, store, admin, Instant.parse("2026-05-04T10:00:00Z"));
        Shift shiftA2 = createClosedShift(staffA, store, admin, Instant.parse("2026-05-05T10:00:00Z"));
        Shift shiftB  = createClosedShift(staffB, store, admin, Instant.parse("2026-05-06T10:00:00Z"));

        // Closures with the financial figures required for the weekly totals
        createClosure(shiftA1, admin, "40.00", "25.00", "15.00", "10.00", "90.00",  "25.00",  "0.00",  "0.00", ClosureStatus.CLOSED_OK);
        createClosure(shiftA2, admin, "20.00", "30.00",  "0.00",  "5.00", "55.00",   "0.00", "-3.00",  "2.00", ClosureStatus.CLOSED_WITH_INCIDENT);
        createClosure(shiftB,  admin, "100.00", "0.00",  "0.00",  "0.00", "100.00", "100.00",  "0.00",  "0.00", ClosureStatus.CLOSED_OK);

        // Incidents — createdAt within [2026-05-04, 2026-05-11)
        createIncident(staffA, shiftA1, Instant.parse("2026-05-04T12:00:00Z"));
        createIncident(staffA, shiftA2, Instant.parse("2026-05-05T12:00:00Z"));
        createIncident(staffB, shiftB,  Instant.parse("2026-05-06T12:00:00Z"));

        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/weekly")
                        .param("storeId", store.getId().toString())
                        .param("weekStart", "2026-05-04")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Weekly report retrieved successfully"))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.weekStart").value("2026-05-04"))
                .andExpect(jsonPath("$.data.weekEnd").value("2026-05-10"))
                .andExpect(jsonPath("$.data.staffSummaries.length()").value(2))

                // Staff A (index 0 — alphabetically first)
                .andExpect(jsonPath("$.data.staffSummaries[0].staffId").value(staffA.getId().toString()))
                .andExpect(jsonPath("$.data.staffSummaries[0].totalCash").value(60.0))
                .andExpect(jsonPath("$.data.staffSummaries[0].totalMb").value(55.0))
                .andExpect(jsonPath("$.data.staffSummaries[0].totalGlovoOnline").value(15.0))
                .andExpect(jsonPath("$.data.staffSummaries[0].totalGlovoCash").value(15.0))
                .andExpect(jsonPath("$.data.staffSummaries[0].totalSales").value(145.0))
                .andExpect(jsonPath("$.data.staffSummaries[0].pendingInvoiceTotal").value(25.0))
                .andExpect(jsonPath("$.data.staffSummaries[0].cashDifferenceTotal").value(-3.0))
                .andExpect(jsonPath("$.data.staffSummaries[0].mbDifferenceTotal").value(2.0))
                .andExpect(jsonPath("$.data.staffSummaries[0].closuresCount").value(2))
                .andExpect(jsonPath("$.data.staffSummaries[0].incidentCount").value(2))

                // Staff B (index 1 — alphabetically second)
                .andExpect(jsonPath("$.data.staffSummaries[1].staffId").value(staffB.getId().toString()))
                .andExpect(jsonPath("$.data.staffSummaries[1].totalCash").value(100.0))
                .andExpect(jsonPath("$.data.staffSummaries[1].totalMb").value(0.0))
                .andExpect(jsonPath("$.data.staffSummaries[1].totalSales").value(100.0))
                .andExpect(jsonPath("$.data.staffSummaries[1].pendingInvoiceTotal").value(100.0))
                .andExpect(jsonPath("$.data.staffSummaries[1].closuresCount").value(1))
                .andExpect(jsonPath("$.data.staffSummaries[1].incidentCount").value(1));
    }

    // -------------------------------------------------------------------------
    // Test 2: STAFF is rejected with 403
    // -------------------------------------------------------------------------

    @Test
    void should_reject_weekly_report_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store, "Weekly Staff Forbidden");
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/weekly")
                        .param("storeId", store.getId().toString())
                        .param("weekStart", "2026-05-04")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Test 3: unknown storeId → 404
    // -------------------------------------------------------------------------

    @Test
    void should_return_not_found_when_store_does_not_exist() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);
        UUID unknownStoreId = UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/weekly")
                        .param("storeId", unknownStoreId.toString())
                        .param("weekStart", "2026-05-04")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Store not found"));
    }

    // -------------------------------------------------------------------------
    // Test 4: GET /api/admin/reports/weekly — missing required storeId param
    //
    // @RequestParam UUID storeId (required = true by default) → Spring throws
    // MissingServletRequestParameterException. The ExceptionHandlerExceptionResolver
    // fires before DefaultHandlerExceptionResolver and routes to the catch-all
    // @ExceptionHandler(Exception.class) in GlobalExceptionHandler → HTTP 500.
    // NOTE: this is a gap in GlobalExceptionHandler; storeId validation should be
    // made explicit (e.g. handled by a dedicated MissingServletRequestParameterException
    // handler returning 400) in a future task.
    // -------------------------------------------------------------------------

    @Test
    void should_return_error_when_store_id_param_is_missing() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert — storeId omitted; weekStart still provided
        mockMvc.perform(get("/api/admin/reports/weekly")
                        .param("weekStart", "2026-05-04")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unexpected internal error"));
    }

}
