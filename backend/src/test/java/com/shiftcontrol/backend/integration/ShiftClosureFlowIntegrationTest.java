package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentSeverity;
import com.shiftcontrol.backend.incidents.model.IncidentSource;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.model.IncidentType;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;

import java.util.List;
import java.math.BigDecimal;
import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ShiftClosureFlowIntegrationTest extends IntegrationTestBase {

  @Test
  void should_reject_staff_closing_shift_when_wifi_ssid_does_not_match_store()
          throws Exception {
      // Arrange
      Store store = createStore();
      User staff = createStaff(store);
      Shift shift = createOpenShift(staff, store);

      String staffToken = jwtService.generateAccessToken(staff);

      // Act + Assert
      mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                      .header(
                              "Authorization",
                              "Bearer " + staffToken
                      )
                      .contentType(MediaType.APPLICATION_JSON)
                      .content("""
                              {
                                "confirmedCashAmount": 103.00,
                                "confirmedMbAmount": 0.00,
                                "note": "Attempt from wrong network",
                                "wifiSsid": "MEO-OTHER-NETWORK"
                              }
                              """))
              .andExpect(status().isBadRequest())
              .andExpect(jsonPath("$.success").value(false))
              .andExpect(jsonPath("$.message").value(
                      "You are not connected to the store Wi-Fi network"
              ))
              .andExpect(jsonPath("$.data").doesNotExist());

      // Confirm that no closure was persisted
      assertThat(
              shiftClosureRepository.existsByShift(shift)
      ).isFalse();

      // Reload the shift to confirm it remains open
      Shift persistedShift = shiftRepository.findById(shift.getId())
              .orElseThrow();

      assertThat(persistedShift.getStatus())
              .isEqualTo(ShiftStatus.OPEN);
  }

    @Test
    void should_close_shift_with_closed_ok_and_reject_sale_creation_after_closure() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert: close shift with matching amounts
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmedCashAmount": 148.00,
                                  "confirmedMbAmount": 0.00,
                                  "note": "End of day ok",
                                  "wifiSsid": "MEO-TEST"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shift closed successfully"))
                .andExpect(jsonPath("$.data.status").value("CLOSED_OK"))
                .andExpect(jsonPath("$.data.totalCash").value(45.00))
                .andExpect(jsonPath("$.data.totalMb").value(0.00))
                .andExpect(jsonPath("$.data.totalSales").value(45.00))
                .andExpect(jsonPath("$.data.pendingInvoiceTotal").value(45.00))
                .andExpect(jsonPath("$.data.cashToWithdraw").value(45.00))
                .andExpect(jsonPath("$.data.expectedPhysicalCash").value(148.00))
                .andExpect(jsonPath("$.data.cashDifference").value(0.00))
                .andExpect(jsonPath("$.data.mbDifference").value(0.00));

        
        ShiftClosure persistedClosure = shiftClosureRepository
                .findWithDetailsByShiftId(shift.getId())
                .orElseThrow();

        List<Incident> incidents = incidentRepository.findAdminFiltered(
                null,
                store.getId(),
                staff.getId(),
                shift.getId(),
                persistedClosure.getId(),
                null
        );

        assertThat(incidents)
                .isEmpty();
                
        // Act + Assert: after closing the shift, staff cannot create another sale
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {
                                      "productName": "Product After Closure",
                                      "quantity": 1,
                                      "unitPrice": 10.00
                                    }
                                  ],
                                  "discounts": [],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 10.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING",
                                  "note": "Should fail"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Staff has no open shift"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void should_close_shift_with_incident_when_amounts_do_not_match() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        // expectedPhysicalCash = 103.00 + 45.00 = 148.00
        // cashDifference = 150.00 - 148.00 = 2.00
        // mbDifference   = 10.00  - 0.00   = 10.00  → CLOSED_WITH_INCIDENT
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmedCashAmount": 150.00,
                                  "confirmedMbAmount": 10.00,
                                  "note": "Amounts do not match",
                                  "wifiSsid": "MEO-TEST"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shift closed successfully"))
                .andExpect(jsonPath("$.data.status").value("CLOSED_WITH_INCIDENT"))
                .andExpect(jsonPath("$.data.totalCash").value(45.00))
                .andExpect(jsonPath("$.data.totalMb").value(0.00))
                .andExpect(jsonPath("$.data.totalSales").value(45.00))
                .andExpect(jsonPath("$.data.pendingInvoiceTotal").value(45.00))
                .andExpect(jsonPath("$.data.cashToWithdraw").value(45.00))
                .andExpect(jsonPath("$.data.expectedPhysicalCash").value(148.00))
                .andExpect(jsonPath("$.data.cashDifference").value(2.00))
                .andExpect(jsonPath("$.data.mbDifference").value(10.00));

        ShiftClosure persistedClosure = shiftClosureRepository
                .findWithDetailsByShiftId(shift.getId())
                .orElseThrow();

        List<Incident> incidents = incidentRepository.findAdminFiltered(
                IncidentStatus.OPEN,
                store.getId(),
                staff.getId(),
                shift.getId(),
                persistedClosure.getId(),
                null
        );

        assertThat(incidents)
                .hasSize(2);

        assertThat(incidents)
                .extracting(Incident::getType)
                .containsExactlyInAnyOrder(
                        IncidentType.CASH_DIFFERENCE,
                        IncidentType.MB_DIFFERENCE
                );

        Incident cashIncident = incidents.stream()
                .filter(incident -> incident.getType() == IncidentType.CASH_DIFFERENCE)
                .findFirst()
                .orElseThrow();

        assertThat(cashIncident.getStatus())
                .isEqualTo(IncidentStatus.OPEN);
        assertThat(cashIncident.getSeverity())
                .isEqualTo(IncidentSeverity.MEDIUM);
        assertThat(cashIncident.getSource())
                .isEqualTo(IncidentSource.AUTOMATIC_CLOSURE);
        assertThat(cashIncident.getShift().getId())
                .isEqualTo(shift.getId());
        assertThat(cashIncident.getClosure().getId())
                .isEqualTo(persistedClosure.getId());
        assertThat(cashIncident.getSale())
                .isNull();
        assertThat(cashIncident.getReportedBy().getId())
                .isEqualTo(staff.getId());
        assertThat(cashIncident.getTitle())
                .isEqualTo("Cash difference detected");
        assertThat(cashIncident.getDescription())
                .isEqualTo("Shift closure recorded a cash difference of +€2.00.");

        Incident mbIncident = incidents.stream()
                .filter(incident -> incident.getType() == IncidentType.MB_DIFFERENCE)
                .findFirst()
                .orElseThrow();

        assertThat(mbIncident.getStatus())
                .isEqualTo(IncidentStatus.OPEN);
        assertThat(mbIncident.getSeverity())
                .isEqualTo(IncidentSeverity.MEDIUM);
        assertThat(mbIncident.getSource())
                .isEqualTo(IncidentSource.AUTOMATIC_CLOSURE);
        assertThat(mbIncident.getShift().getId())
                .isEqualTo(shift.getId());
        assertThat(mbIncident.getClosure().getId())
                .isEqualTo(persistedClosure.getId());
        assertThat(mbIncident.getSale())
                .isNull();
        assertThat(mbIncident.getReportedBy().getId())
                .isEqualTo(staff.getId());
        assertThat(mbIncident.getTitle())
                .isEqualTo("MB difference detected");
        assertThat(mbIncident.getDescription())
                .isEqualTo("Shift closure recorded an MB difference of +€10.00.");
    }

    @Test
    void should_reject_second_close_attempt() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Act 1: first close — should succeed
        // expectedPhysicalCash = 103.00 + 45.00 = 148.00 → amounts match → CLOSED_OK
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmedCashAmount": 148.00,
                                  "confirmedMbAmount": 0.00,
                                  "note": "First close",
                                  "wifiSsid": "MEO-TEST"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED_OK"));

        // Act 2: second close attempt on same shift — should be rejected
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmedCashAmount": 148.00,
                                  "confirmedMbAmount": 0.00,
                                  "note": "Second close"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Shift is already closed"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void should_exclude_cancelled_sales_from_shift_closure_totals() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act 1: Create sale A (50.00 EUR in cash)
        String saleAResponse = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {
                                      "productName": "Coffee",
                                      "quantity": 1,
                                      "unitPrice": 50.00
                                    }
                                  ],
                                  "discounts": [],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 50.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.finalTotalAmount").value(50.00))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String saleAId = com.jayway.jsonpath.JsonPath.read(saleAResponse, "$.data.id");

        // Act 2: Create sale B (30.00 EUR in cash)
        String saleBResponse = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {
                                      "productName": "Tea",
                                      "quantity": 1,
                                      "unitPrice": 30.00
                                    }
                                  ],
                                  "discounts": [],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 30.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.finalTotalAmount").value(30.00))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String saleBId = com.jayway.jsonpath.JsonPath.read(saleBResponse, "$.data.id");

        // Act 3: Cancel sale B
        mockMvc.perform(patch("/api/sales/{id}/cancel", saleBId)
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "Customer changed order"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Sale cancelled successfully"))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelledReason").value("Customer changed order"));

        // Act 4: Close shift
        // expectedPhysicalCash = 103.00 (base) + 50.00 (sale A only) = 153.00
        // Sale B (30.00) must NOT be included because it's CANCELLED
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmedCashAmount": 153.00,
                                  "confirmedMbAmount": 0.00,
                                  "note": "End of day - Phase 17.1B test",
                                  "wifiSsid": "MEO-TEST"
                                }
                                """))
                // Assert: totalSales must be 50.00 (only sale A)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shift closed successfully"))
                .andExpect(jsonPath("$.data.status").value("CLOSED_OK"))
                .andExpect(jsonPath("$.data.totalSales").value(50.00))
                .andExpect(jsonPath("$.data.totalCash").value(50.00))
                .andExpect(jsonPath("$.data.totalMb").value(0.00))
                .andExpect(jsonPath("$.data.cashToWithdraw").value(50.00))
                .andExpect(jsonPath("$.data.expectedPhysicalCash").value(153.00))
                .andExpect(jsonPath("$.data.cashDifference").value(0.00))
                .andExpect(jsonPath("$.data.mbDifference").value(0.00));
    }

    @Test
        void should_list_closed_shift_with_closure_and_incident_summary() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Close shift with differences:
        // expectedPhysicalCash = 103.00 + 45.00 = 148.00
        // confirmedCash = 150.00 -> cashDifference = +2.00
        // confirmedMb = 10.00 -> mbDifference = +10.00
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                "confirmedCashAmount": 150.00,
                                "confirmedMbAmount": 10.00,
                                "note": "Amounts do not match",
                                "wifiSsid": "MEO-TEST"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED_WITH_INCIDENT"));

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/shifts")
                        .param("storeId", store.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shifts retrieved successfully"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(shift.getId().toString()))
                .andExpect(jsonPath("$.data[0].status").value("CLOSED"))
                .andExpect(jsonPath("$.data[0].closureStatus").value("CLOSED_WITH_INCIDENT"))
                .andExpect(jsonPath("$.data[0].cashDifference").value(2.00))
                .andExpect(jsonPath("$.data[0].mbDifference").value(10.00))
                .andExpect(jsonPath("$.data[0].openIncidentCount").value(2))
                .andExpect(jsonPath("$.data[0].totalIncidentCount").value(2));
        }

        @Test
        void should_get_closed_shift_detail_with_closure_and_incident_summary() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Close shift with differences:
        // expectedPhysicalCash = 103.00 + 45.00 = 148.00
        // confirmedCash = 150.00 -> cashDifference = +2.00
        // confirmedMb = 10.00 -> mbDifference = +10.00
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                "confirmedCashAmount": 150.00,
                                "confirmedMbAmount": 10.00,
                                "note": "Amounts do not match",
                                "wifiSsid": "MEO-TEST"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED_WITH_INCIDENT"));

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/shifts/{id}", shift.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shift retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(shift.getId().toString()))
                .andExpect(jsonPath("$.data.status").value("CLOSED"))
                .andExpect(jsonPath("$.data.closureStatus").value("CLOSED_WITH_INCIDENT"))
                .andExpect(jsonPath("$.data.cashDifference").value(2.00))
                .andExpect(jsonPath("$.data.mbDifference").value(10.00))
                .andExpect(jsonPath("$.data.openIncidentCount").value(2))
                .andExpect(jsonPath("$.data.totalIncidentCount").value(2));
        }

        @Test
        void should_list_automatic_closure_incidents_by_shift_filter() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Close shift with differences:
        // expectedPhysicalCash = 103.00 + 45.00 = 148.00
        // confirmedCash = 150.00 -> cashDifference = +2.00
        // confirmedMb = 10.00 -> mbDifference = +10.00
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                "confirmedCashAmount": 150.00,
                                "confirmedMbAmount": 10.00,
                                "note": "Amounts do not match",
                                "wifiSsid": "MEO-TEST"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED_WITH_INCIDENT"));

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/incidents")
                        .param("shiftId", shift.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Incidents retrieved successfully"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[*].source",
                        org.hamcrest.Matchers.everyItem(
                                org.hamcrest.Matchers.is("AUTOMATIC_CLOSURE")
                        )))
                .andExpect(jsonPath("$.data[*].status",
                        org.hamcrest.Matchers.everyItem(
                                org.hamcrest.Matchers.is("OPEN")
                        )))
                .andExpect(jsonPath("$.data[?(@.type == 'CASH_DIFFERENCE')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.type == 'MB_DIFFERENCE')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.type == 'CASH_DIFFERENCE')].title")
                        .value(org.hamcrest.Matchers.hasItem("Cash difference detected")))
                .andExpect(jsonPath("$.data[?(@.type == 'MB_DIFFERENCE')].title")
                        .value(org.hamcrest.Matchers.hasItem("MB difference detected")));
        }

        @Test
        void should_list_automatic_closure_incidents_by_closure_filter() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Close shift with differences:
        // expectedPhysicalCash = 103.00 + 45.00 = 148.00
        // confirmedCash = 150.00 -> cashDifference = +2.00
        // confirmedMb = 10.00 -> mbDifference = +10.00
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                "confirmedCashAmount": 150.00,
                                "confirmedMbAmount": 10.00,
                                "note": "Amounts do not match",
                                "wifiSsid": "MEO-TEST"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED_WITH_INCIDENT"));

        ShiftClosure persistedClosure = shiftClosureRepository
                .findWithDetailsByShiftId(shift.getId())
                .orElseThrow();

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/incidents")
                        .param("closureId", persistedClosure.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Incidents retrieved successfully"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[*].closureId",
                        org.hamcrest.Matchers.everyItem(
                                org.hamcrest.Matchers.is(persistedClosure.getId().toString())
                        )))
                .andExpect(jsonPath("$.data[*].shiftId",
                        org.hamcrest.Matchers.everyItem(
                                org.hamcrest.Matchers.is(shift.getId().toString())
                        )))
                .andExpect(jsonPath("$.data[*].source",
                        org.hamcrest.Matchers.everyItem(
                                org.hamcrest.Matchers.is("AUTOMATIC_CLOSURE")
                        )))
                .andExpect(jsonPath("$.data[*].status",
                        org.hamcrest.Matchers.everyItem(
                                org.hamcrest.Matchers.is("OPEN")
                        )))
                .andExpect(jsonPath("$.data[?(@.type == 'CASH_DIFFERENCE')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.type == 'MB_DIFFERENCE')]").isNotEmpty());
        }

        @Test
        void should_reject_automatic_closure_incident_without_closure() {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);

        Instant now = Instant.now();

        Incident incident = new Incident();
        incident.setShift(shift);
        incident.setClosure(null);
        incident.setSale(null);
        incident.setReportedBy(staff);
        incident.setResolvedBy(null);
        incident.setType(IncidentType.CASH_DIFFERENCE);
        incident.setStatus(IncidentStatus.OPEN);
        incident.setSeverity(IncidentSeverity.MEDIUM);
        incident.setSource(IncidentSource.AUTOMATIC_CLOSURE);
        incident.setTitle("Cash difference detected");
        incident.setDescription("Shift closure recorded a cash difference of +€4.00.");
        incident.setResolutionNote(null);
        incident.setCreatedAt(now);
        incident.setUpdatedAt(now);
        incident.setResolvedAt(null);

        // Act + Assert
        assertThatThrownBy(() -> {
                incidentRepository.saveAndFlush(incident);
        })
                .isInstanceOf(DataIntegrityViolationException.class);
        }

        @Test
        void should_update_shift_incident_summary_after_resolving_automatic_incident() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                "confirmedCashAmount": 150.00,
                                "confirmedMbAmount": 10.00,
                                "note": "Amounts do not match",
                                "wifiSsid": "MEO-TEST"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED_WITH_INCIDENT"));

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/shifts/{id}", shift.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.openIncidentCount").value(2))
                .andExpect(jsonPath("$.data.totalIncidentCount").value(2));

        List<Incident> incidents = incidentRepository.findAdminFiltered(
                IncidentStatus.OPEN,
                store.getId(),
                staff.getId(),
                shift.getId(),
                null,
                null
        );

        Incident incidentToResolve = incidents.stream()
                .filter(incident -> incident.getType() == IncidentType.CASH_DIFFERENCE)
                .findFirst()
                .orElseThrow();

        // Act
        mockMvc.perform(patch("/api/incidents/{id}/resolve", incidentToResolve.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                "resolutionNote": "Cash difference reviewed."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.source").value("AUTOMATIC_CLOSURE"));

        // Assert
        mockMvc.perform(get("/api/shifts/{id}", shift.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.closureStatus").value("CLOSED_WITH_INCIDENT"))
                .andExpect(jsonPath("$.data.cashDifference").value(2.00))
                .andExpect(jsonPath("$.data.mbDifference").value(10.00))
                .andExpect(jsonPath("$.data.openIncidentCount").value(1))
                .andExpect(jsonPath("$.data.totalIncidentCount").value(2));
        }
}