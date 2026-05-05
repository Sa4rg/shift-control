package com.shiftcontrol.backend.sales.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateSaleItemRequest(

        @NotBlank
        @Size(max = 160)
        String productName,

        @Positive
        int quantity,

        @NotNull
        @Positive
        BigDecimal unitPrice
) {
}