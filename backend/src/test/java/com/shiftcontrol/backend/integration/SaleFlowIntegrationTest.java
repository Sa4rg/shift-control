package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.Instant;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleFlowIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: POST /api/sales — staff creates sale with cash payment
    // -------------------------------------------------------------------------

    @Test
    void should_create_sale_as_staff_with_cash_payment() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {
                                      "productName": "Coffee",
                                      "unitPrice": 10.00,
                                      "quantity": 2
                                    }
                                  ],
                                  "discounts": [],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 20.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Sale created successfully"))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.shiftId").value(shift.getId().toString()))
                .andExpect(jsonPath("$.data.staffId").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.invoiceStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.subtotalAmount").value(20.00))
                .andExpect(jsonPath("$.data.discountTotalAmount").value(0.00))
                .andExpect(jsonPath("$.data.finalTotalAmount").value(20.00))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].productName").value("Coffee"))
                .andExpect(jsonPath("$.data.items[0].lineTotal").value(20.00))
                .andExpect(jsonPath("$.data.payments.length()").value(1))
                .andExpect(jsonPath("$.data.payments[0].method").value("CASH"))
                .andExpect(jsonPath("$.data.payments[0].amount").value(20.00));
    }

    // -------------------------------------------------------------------------
    // Test 2: POST /api/sales — rejected when staff has no open shift
    // -------------------------------------------------------------------------

    @Test
    void should_reject_sale_creation_without_open_shift() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        // No open shift created
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {
                                      "productName": "Coffee",
                                      "unitPrice": 5.00,
                                      "quantity": 1
                                    }
                                  ],
                                  "discounts": [],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 5.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Staff has no open shift"));
    }

    // -------------------------------------------------------------------------
    // Test 3: POST /api/sales — rejected when items list is empty
    // -------------------------------------------------------------------------

    @Test
    void should_reject_sale_creation_when_items_are_empty() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        createOpenShift(staff, store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        // items is annotated @NotEmpty — DTO validation fires before service logic
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [],
                                  "discounts": [],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 10.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    // -------------------------------------------------------------------------
    // Test 4: GET /api/sales/{id} — owner staff retrieves their sale
    // -------------------------------------------------------------------------

    @Test
    void should_get_sale_by_id_for_owner_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Sale sale = createActiveCashSale(shift, staff, store, new BigDecimal("15.00"));
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/sales/{id}", sale.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Sale retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(sale.getId().toString()))
                .andExpect(jsonPath("$.data.staffId").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    // -------------------------------------------------------------------------
    // Test 5: GET /api/sales?shiftId=current — staff sees only their current shift sales
    // -------------------------------------------------------------------------

    @Test
    void should_list_current_shift_sales() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Sale saleA = createActiveCashSale(shift, staff, store, new BigDecimal("10.00"));
        Sale saleB = createActiveCashSale(shift, staff, store, new BigDecimal("25.00"));
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/sales")
                        .param("shiftId", "current")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Sales retrieved successfully"))
                .andExpect(jsonPath("$.data[?(@.id == '" + saleA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + saleB.getId() + "')]").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 6: PATCH /api/sales/{id}/invoice — staff marks sale as invoiced
    // -------------------------------------------------------------------------

    @Test
    void should_mark_sale_as_invoiced() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Sale sale = createActiveCashSale(shift, staff, store, new BigDecimal("30.00"));
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(patch("/api/sales/{id}/invoice", sale.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Sale marked as invoiced successfully"))
                .andExpect(jsonPath("$.data.id").value(sale.getId().toString()))
                .andExpect(jsonPath("$.data.invoiceStatus").value("INVOICED"));
    }

    // -------------------------------------------------------------------------
    // Test 7: PATCH /api/sales/{id}/cancel — staff cancels sale with reason trimming
    // -------------------------------------------------------------------------

    @Test
    void should_cancel_sale() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Sale sale = createActiveCashSale(shift, staff, store, new BigDecimal("12.00"));
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(patch("/api/sales/{id}/cancel", sale.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "  Customer changed order  "
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Sale cancelled successfully"))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelledReason").value("Customer changed order"))
                .andExpect(jsonPath("$.data.cancelledAt").isNotEmpty())
                .andExpect(jsonPath("$.data.cancelledById").value(staff.getId().toString()));
    }

    // -------------------------------------------------------------------------
    // Test 9: PATCH /api/sales/{id}/cancel — rejected when shift is already closed
    // -------------------------------------------------------------------------

    @Test
    void should_reject_cancelling_sale_from_closed_shift() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift closedShift = createClosedShift(staff, store, staff, Instant.now());
        Sale sale = createActiveCashSale(closedShift, staff, store, new BigDecimal("20.00"));
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(patch("/api/sales/{id}/cancel", sale.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "Cannot cancel now"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Closed shift sale cannot be cancelled"));
    }
}
