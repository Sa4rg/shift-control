package com.shiftcontrol.backend.sales.dto;

import com.shiftcontrol.backend.sales.model.DiscountReason;
import com.shiftcontrol.backend.sales.model.DiscountType;
import com.shiftcontrol.backend.sales.model.SaleDiscount;

import java.math.BigDecimal;
import java.util.UUID;

public record SaleDiscountResponse(
        UUID id,
        DiscountType type,
        DiscountReason reason,
        BigDecimal value,
        BigDecimal amountApplied,
        String note
) {
    public static SaleDiscountResponse fromEntity(SaleDiscount discount) {
        return new SaleDiscountResponse(
                discount.getId(),
                discount.getType(),
                discount.getReason(),
                discount.getValue(),
                discount.getAmountApplied(),
                discount.getNote()
        );
    }
}