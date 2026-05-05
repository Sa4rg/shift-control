package com.shiftcontrol.backend.sales.dto;

import com.shiftcontrol.backend.sales.model.DiscountReason;
import jakarta.validation.constraints.Size;

public record CreateSaleDiscountRequest(

        DiscountReason reason,

        @Size(max = 500)
        String note
) {
}