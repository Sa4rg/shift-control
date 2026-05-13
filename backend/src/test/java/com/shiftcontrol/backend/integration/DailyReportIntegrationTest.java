package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DailyReportIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: admin recibe el reporte diario completo con todos los totales
    // -------------------------------------------------------------------------

    @Test
    void should_return_daily_report_for_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staffA = createStaff(store, "Daily StaffA");
        User staffB = createStaff(store, "Daily StaffB");

        // Staff A — cierre 1 en 2026-05-10 (CLOSED_OK)
        Shift shiftA1 = createClosedShift(staffA, store, admin, Instant.parse("2026-05-10T10:00:00Z"));
        createClosure(shiftA1, admin,
                "40.00", "25.00", "15.00", "10.00",
                "90.00", "25.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        // Staff A — cierre 2 en 2026-05-10 (CLOSED_WITH_INCIDENT)
        Shift shiftA2 = createClosedShift(staffA, store, admin, Instant.parse("2026-05-10T12:00:00Z"));
        createClosure(shiftA2, admin,
                "20.00", "30.00", "0.00", "5.00",
                "55.00", "0.00",
                "-3.00", "2.00",
                ClosureStatus.CLOSED_WITH_INCIDENT);

        // Staff B — cierre en 2026-05-10 (CLOSED_OK)
        Shift shiftB = createClosedShift(staffB, store, admin, Instant.parse("2026-05-10T15:00:00Z"));
        createClosure(shiftB, admin,
                "100.00", "0.00", "0.00", "0.00",
                "100.00", "100.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        // Ventas en 2026-05-10 — 3 ACTIVE + 1 CANCELLED
        Instant inDay = Instant.parse("2026-05-10T11:00:00Z");
        createSale(store, staffA, shiftA1, SaleStatus.ACTIVE,    inDay);
        createSale(store, staffA, shiftA1, SaleStatus.ACTIVE,    inDay);
        createSale(store, staffB, shiftB,  SaleStatus.ACTIVE,    inDay);
        createSale(store, staffA, shiftA1, SaleStatus.CANCELLED, inDay);

        // Incidentes en 2026-05-10
        createIncident(staffA, shiftA1, IncidentStatus.OPEN,     Instant.parse("2026-05-10T10:30:00Z"));
        createIncident(staffA, shiftA2, IncidentStatus.RESOLVED, Instant.parse("2026-05-10T12:30:00Z"));
        createIncident(staffB, shiftB,  IncidentStatus.OPEN,     Instant.parse("2026-05-10T15:30:00Z"));

        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/daily")
                        .param("storeId", store.getId().toString())
                        .param("date", "2026-05-10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Daily report retrieved successfully"))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.storeName").value(store.getName()))
                .andExpect(jsonPath("$.data.date").value("2026-05-10"))
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
                .andExpect(jsonPath("$.data.staffSummaries.length()").value(2));
    }

    // -------------------------------------------------------------------------
    // Test 2: token STAFF es rechazado con 403
    // -------------------------------------------------------------------------

    @Test
    void should_reject_daily_report_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store, "Daily Forbidden Staff");
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/daily")
                        .param("storeId", store.getId().toString())
                        .param("date", "2026-05-10")
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
        mockMvc.perform(get("/api/admin/reports/daily")
                        .param("storeId", unknownStoreId.toString())
                        .param("date", "2026-05-10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Store not found"));
    }

    // -------------------------------------------------------------------------
    // Test 4: datos fuera de la fecha solicitada no se incluyen en el reporte
    // -------------------------------------------------------------------------

    @Test
    void should_exclude_data_outside_requested_date() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store, "Daily Boundary Staff");

        // Cierre dentro de 2026-05-10
        Shift shiftInDay = createClosedShift(staff, store, admin, Instant.parse("2026-05-10T10:00:00Z"));
        createClosure(shiftInDay, admin,
                "100.00", "0.00", "0.00", "0.00",
                "100.00", "0.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        // Cierre fuera de 2026-05-10 (día siguiente)
        Shift shiftOutside = createClosedShift(staff, store, admin, Instant.parse("2026-05-11T10:00:00Z"));
        createClosure(shiftOutside, admin,
                "999.00", "0.00", "0.00", "0.00",
                "999.00", "0.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/daily")
                        .param("storeId", store.getId().toString())
                        .param("date", "2026-05-10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSales").value(100.0))
                .andExpect(jsonPath("$.data.closuresCount").value(1));
    }

}
