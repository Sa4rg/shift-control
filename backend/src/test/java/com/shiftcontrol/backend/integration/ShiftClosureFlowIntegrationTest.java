package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ShiftClosureFlowIntegrationTest extends IntegrationTestBase {

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
                                  "note": "End of day ok"
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
                                  "note": "Amounts do not match"
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
                                  "note": "First close"
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
                                  "note": "End of day - Phase 17.1B test"
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
}