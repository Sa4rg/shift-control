package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

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

    // -------------------------------------------------------------------------
    // Test 10: POST /api/sales — staff creates sale with manual discount
    // -------------------------------------------------------------------------

    @Test
    void should_create_sale_with_manual_discount() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        createOpenShift(staff, store);
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
                                      "unitPrice": 30.00,
                                      "quantity": 1
                                    }
                                  ],
                                  "discounts": [
                                    {
                                      "reason": "MANUAL_DISCOUNT",
                                      "amount": 5.00,
                                      "note": "  Manager approved discount  "
                                    }
                                  ],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 25.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Sale created successfully"))
                .andExpect(jsonPath("$.data.subtotalAmount").value(30.00))
                .andExpect(jsonPath("$.data.discountTotalAmount").value(5.00))
                .andExpect(jsonPath("$.data.finalTotalAmount").value(25.00))
                .andExpect(jsonPath("$.data.discounts.length()").value(1))
                .andExpect(jsonPath("$.data.discounts[0].type").value("FIXED_AMOUNT"))
                .andExpect(jsonPath("$.data.discounts[0].reason").value("MANUAL_DISCOUNT"))
                .andExpect(jsonPath("$.data.discounts[0].value").value(5.00))
                .andExpect(jsonPath("$.data.discounts[0].amountApplied").value(5.00))
                .andExpect(jsonPath("$.data.discounts[0].note").value("Manager approved discount"));
    }

    // -------------------------------------------------------------------------
    // Test 11: POST /api/sales — rejected when manual discount has no note
    // -------------------------------------------------------------------------

    @Test
    void should_reject_manual_discount_without_note() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        createOpenShift(staff, store);
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
                                      "unitPrice": 30.00,
                                      "quantity": 1
                                    }
                                  ],
                                  "discounts": [
                                    {
                                      "reason": "MANUAL_DISCOUNT",
                                      "amount": 5.00
                                    }
                                  ],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 25.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Manual discount requires a note"));
    }

    // -------------------------------------------------------------------------
    // Test 12: POST /api/sales — rejected when manual discount has no amount
    // -------------------------------------------------------------------------

    @Test
    void should_reject_manual_discount_without_amount() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        createOpenShift(staff, store);
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
                                      "unitPrice": 30.00,
                                      "quantity": 1
                                    }
                                  ],
                                  "discounts": [
                                    {
                                      "reason": "MANUAL_DISCOUNT",
                                      "note": "Manager approved"
                                    }
                                  ],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 25.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Manual discount amount must be greater than zero"));
    }

    // -------------------------------------------------------------------------
    // Test 13: GET /api/sales?shiftId=<UUID> — admin lists sales for any shift
    // -------------------------------------------------------------------------

    @Test
    void should_list_sales_by_shift_id_for_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("15.00"));
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/sales")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("shiftId", shift.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    // -------------------------------------------------------------------------
    // Test 14: GET /api/sales?shiftId=<UUID> — staff lists their own shift sales
    // -------------------------------------------------------------------------

    @Test
    void should_list_sales_by_shift_id_for_owner_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("20.00"));
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/sales")
                        .header("Authorization", "Bearer " + staffToken)
                        .param("shiftId", shift.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    // -------------------------------------------------------------------------
    // Test 15: GET /api/sales?shiftId=<UUID> — rejected when staff accesses other shift
    // -------------------------------------------------------------------------

    @Test
    void should_reject_sales_by_shift_id_for_other_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);
        createOpenShift(staffB, store);
        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(get("/api/sales")
                        .header("Authorization", "Bearer " + staffBToken)
                        .param("shiftId", shiftA.getId().toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not allowed to access this shift"));
    }

    // -------------------------------------------------------------------------
    // Test 16: GET /api/sales?shiftId=not-a-uuid — rejected with 400
    // -------------------------------------------------------------------------

    @Test
    void should_return_400_when_shift_id_is_invalid() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/sales")
                        .header("Authorization", "Bearer " + staffToken)
                        .param("shiftId", "not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid shiftId"));
    }

    // -------------------------------------------------------------------------
    // Test 17: GET /api/sales?shiftId=<random UUID> — 404 when shift not found
    // -------------------------------------------------------------------------

    @Test
    void should_return_404_when_shift_does_not_exist() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/sales")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("shiftId", UUID.randomUUID().toString()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Shift not found"));
    }

    // -------------------------------------------------------------------------
    // Test 18: GET /api/sales — 400 when shiftId is missing
    // -------------------------------------------------------------------------

    @Test
    void should_return_400_when_shift_id_is_missing() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/sales")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("shiftId is required"));
    }
}
