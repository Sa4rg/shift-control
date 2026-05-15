package com.shiftcontrol.backend.sales.dto;

import com.shiftcontrol.backend.sales.model.DiscountReason;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateSaleDiscountRequest(

        DiscountReason reason,

        BigDecimal amount,

        @Size(max = 500)
        String note
) {
}