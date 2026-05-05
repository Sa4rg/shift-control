package com.shiftcontrol.backend.sales.dto;

import com.shiftcontrol.backend.sales.model.SaleItem;

import java.math.BigDecimal;
import java.util.UUID;

public record SaleItemResponse(
        UUID id,
        String productName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {
    public static SaleItemResponse fromEntity(SaleItem item) {
        return new SaleItemResponse(
                item.getId(),
                item.getProductName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal()
        );
    }
}