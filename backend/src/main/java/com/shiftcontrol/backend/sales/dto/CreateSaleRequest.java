package com.shiftcontrol.backend.sales.dto;

import com.shiftcontrol.backend.sales.model.InvoiceStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateSaleRequest(

        @NotEmpty
        @Valid
        List<CreateSaleItemRequest> items,

        @Valid
        List<CreateSaleDiscountRequest> discounts,

        @NotEmpty
        @Valid
        List<CreateSalePaymentRequest> payments,

        @NotNull
        InvoiceStatus invoiceStatus,

        @Size(max = 500)
        String note
) {
}