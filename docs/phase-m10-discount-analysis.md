# M10.1 — Discount Support: Backend Contract Analysis

**Date:** 2026-05-21

## Files Inspected

- `backend/src/main/java/…/sales/model/DiscountType.java`
- `backend/src/main/java/…/sales/model/DiscountReason.java`
- `backend/src/main/java/…/sales/model/SaleDiscount.java`
- `backend/src/main/java/…/sales/dto/CreateSaleDiscountRequest.java`
- `backend/src/main/java/…/sales/dto/CreateSaleRequest.java`
- `backend/src/main/java/…/sales/dto/SaleDiscountResponse.java`
- `backend/src/main/java/…/sales/dto/SaleResponse.java`
- `backend/src/main/java/…/sales/service/SaleService.java`
- `backend/src/main/java/…/shifts/service/ShiftService.java`
- `backend/src/main/resources/db/migration/V6__create_sales_tables.sql`
- `backend/src/test/…/sales/service/SaleServiceTest.java`
- `backend/src/test/…/integration/SaleFlowIntegrationTest.java`
- `docs/mobile-api-contract.md`

---

## 1. Discount Types — Two Separate Enums

The backend has **two distinct enums**:

| Enum | Values | Purpose |
|---|---|---|
| `DiscountReason` | `LOYALTY_CARD`, `VOUCHER_10_PERCENT`, `MANUAL_DISCOUNT` | What mobile sends in the request |
| `DiscountType` | `FIXED_AMOUNT`, `PERCENTAGE` | Internal categorization assigned by the server |

Mobile only knows and sends `reason`. The server assigns `type` internally based on business logic.

---

## 2. CreateSaleRequest — Exact Discount Shape

```json
"discounts": []
```

`discounts` is `List<CreateSaleDiscountRequest>`. It can be `null` or an empty list — both are treated the same (no discounts).

Each item depends on the reason:

**LOYALTY_CARD**
```json
{ "reason": "LOYALTY_CARD" }
```
- `amount`: do NOT send (ignored if sent)
- `note`: optional
- Requirement: subtotal >= 25.00

**VOUCHER_10_PERCENT**
```json
{ "reason": "VOUCHER_10_PERCENT" }
```
- `amount`: do NOT send (ignored if sent)
- `note`: optional
- No minimum subtotal requirement

**MANUAL_DISCOUNT**
```json
{ "reason": "MANUAL_DISCOUNT", "amount": 5.00, "note": "Manager approved" }
```
- `amount`: **REQUIRED**, positive decimal, strictly less than subtotal
- `note`: **REQUIRED**, cannot be null or blank
- `amount` is an absolute EUR value (not a percentage)

---

## 3. Calculation Rules

```
subtotal = sum(item.quantity × item.unitPrice)   // scale 2, HALF_UP
```

Each discount calculates its `amountApplied` **against the original subtotal**, not against the running discounted total:

| Reason | amountApplied Calculation |
|---|---|
| `LOYALTY_CARD` | Always 20.00 EUR fixed |
| `VOUCHER_10_PERCENT` | `subtotal × 10 / 100`, scale 2 HALF_UP |
| `MANUAL_DISCOUNT` | The `amount` sent by mobile |

```
discountTotal = sum(discount.amountApplied)       // scale 2, HALF_UP
finalTotal    = subtotal - discountTotal           // scale 2, HALF_UP
```

**Critical rules:**
- `finalTotal` must be **> 0** — explicit check → error `Sale final total must be greater than zero`
- Multiple discounts are supported and summed together
- No restriction on duplicate reason types in code (though using LOYALTY_CARD twice makes no sense)
- MANUAL_DISCOUNT validates `amount < subtotal` individually — if combined with other discounts and the result causes `finalTotal ≤ 0`, the final `finalTotal > 0` check catches it
- No "cascading discount" concept: VOUCHER_10_PERCENT is always 10% of the gross subtotal, not of the subtotal already reduced by a previous discount

**Example with multiple discounts** (subtotal = 50.00):
- LOYALTY_CARD: amountApplied = 20.00
- MANUAL_DISCOUNT(5.00): amountApplied = 5.00
- discountTotal = 25.00, finalTotal = 25.00 ✓

---

## 4. Payments Relationship

```
sum(payments[].amount) === finalTotalAmount   // exact BigDecimal comparison
```

If it does not match → `Payment total must match sale final total`.

**Important consequence for mobile:** mobile must calculate `finalTotal` locally as a **UI preview**, then send `payments[].amount = finalTotal`. If the local calculation differs from the server due to rounding, the call will fail.

Correct local calculation for preview:
- `LOYALTY_CARD`: `finalTotal = round2(subtotal - 20.00)`
- `VOUCHER_10_PERCENT`: `finalTotal = round2(subtotal × 0.90)`
- `MANUAL_DISCOUNT(x)`: `finalTotal = round2(subtotal - x)`

A single payment is valid. The same payment method cannot appear twice in the same sale (DB unique constraint).

---

## 5. Invoice and Cancel Behavior

Discounts do not affect `markInvoiced` or `cancelSale`. Both operations work with the `Sale` as a whole. No additional restrictions for discounted sales.

---

## 6. SaleResponse — Discount Shape

Each discount in the response:

```json
{
  "id": "uuid",
  "type": "FIXED_AMOUNT",        // or "PERCENTAGE" — assigned by server
  "reason": "LOYALTY_CARD",      // what mobile sent
  "value": 20.00,                // discount parameter: fixed amount or percentage (10.00 for 10%)
  "amountApplied": 20.00,        // EUR actually deducted
  "note": null                   // or the string if provided
}
```

For VOUCHER_10_PERCENT: `value = 10.00` (the percentage), `amountApplied = subtotal × 0.10`.

Money fields in `SaleResponse`:
```json
{
  "subtotalAmount": 30.00,
  "discountTotalAmount": 5.00,
  "finalTotalAmount": 25.00,
  "discounts": [...],
  "payments": [...]
}
```

---

## 7. Close Shift / Reports Impact

Everything uses `Sale::getFinalTotalAmount` — the net post-discount amount:

```java
// ShiftService.java line 305, 311
.map(Sale::getFinalTotalAmount)
```

- Shift close `totalSales` = sum of `finalTotalAmount` of all active sales
- `totalCash`, `totalMb`, etc. = sum of `SalePayment.amount` by method (which client sent equal to `finalTotalAmount`)
- `discountTotalAmount` **does not appear** in any report or shift close preview — it only lives on the individual sale

---

## 8. Existing Tests

`SaleServiceTest.java` fully covers all three types:

| Test | Covers |
|---|---|
| `should_create_sale_with_loyalty_card_discount_when_subtotal_is_at_least_25` | LOYALTY_CARD happy path |
| `should_throw_when_loyalty_card_discount_subtotal_is_less_than_25` | LOYALTY_CARD subtotal < 25 |
| `should_create_sale_with_voucher_10_percent_discount` | VOUCHER_10_PERCENT happy path |
| `should_create_sale_with_manual_discount_fixed_amount` | MANUAL_DISCOUNT happy path |
| `should_throw_when_manual_discount_amount_is_null` | MANUAL without amount |
| `should_throw_when_manual_discount_amount_is_zero` | MANUAL amount = 0 |
| `should_throw_when_manual_discount_amount_exceeds_subtotal` | MANUAL amount > subtotal |
| `should_throw_when_manual_discount_amount_equals_subtotal` | MANUAL amount === subtotal |
| `should_throw_when_manual_discount_note_is_null` | MANUAL without note |
| `should_throw_when_manual_discount_note_is_blank` | MANUAL blank note |
| `should_create_sale_combining_loyalty_card_and_manual_discount` | Multiple discounts |
| `should_throw_when_discount_reason_is_null` | reason = null |
| `should_throw_when_payment_total_does_not_match_final_total` | Wrong payment amount |

**Not yet tested:**
- `finalTotal <= 0` caused by a combination of multiple discounts
- HTTP integration test for sales with discounts (`SaleFlowIntegrationTest` only covers no-discount sales)

---

## 9. Mobile Implementation Recommendation — M10.1

**No backend bugs found.** The contract is complete and well tested.

**Suggested approach — implement all three types from the start:** all three are simple and the contract is clear.

### UI Flow

1. User adds items (subtotal calculated locally in real time)
2. Optional "Add discount" section — select type:
   - `LOYALTY_CARD` → button, no extra input, disabled if subtotal < 25.00
   - `VOUCHER_10_PERCENT` → button, no extra input
   - `MANUAL_DISCOUNT` → numeric input for `amount` + text input for `note`
3. Real-time preview: show subtotal, discount amount, and finalTotal
4. Payment amount field auto-filled with `finalTotal`
5. On submit: send `discounts[]` with only 1 discount (MVP)

### What Mobile Calculates (local preview only)

```ts
// LOYALTY_CARD
finalTotal = round2(subtotal - 20.00)

// VOUCHER_10_PERCENT
discountAmount = round2(subtotal * 0.10)
finalTotal = round2(subtotal - discountAmount)

// MANUAL_DISCOUNT
finalTotal = round2(subtotal - manualAmount)
```

### What the Backend Does (authoritative)

- Validation of all business rules
- Official calculation of all totals
- Verification that `sum(payments) === finalTotal`

### Client-Side Validations (UX, before submit)

- LOYALTY_CARD: disable button if `subtotal < 25.00`
- MANUAL_DISCOUNT: `amount > 0`, `amount < subtotal`, `note` not empty
- `finalTotal > 0` (prevent submission)

---

## 10. Request JSON Examples per Type

```json
// LOYALTY_CARD — subtotal 30.00, payment 10.00
{
  "items": [{ "productName": "Pastel", "quantity": 1, "unitPrice": 30.00 }],
  "discounts": [{ "reason": "LOYALTY_CARD" }],
  "payments": [{ "method": "CASH", "amount": 10.00 }],
  "invoiceStatus": "PENDING"
}

// VOUCHER_10_PERCENT — subtotal 50.00, payment 45.00
{
  "items": [{ "productName": "Menu", "quantity": 1, "unitPrice": 50.00 }],
  "discounts": [{ "reason": "VOUCHER_10_PERCENT" }],
  "payments": [{ "method": "MB", "amount": 45.00 }],
  "invoiceStatus": "PENDING"
}

// MANUAL_DISCOUNT — subtotal 30.00, discount 5.00, payment 25.00
{
  "items": [{ "productName": "Coffee", "quantity": 3, "unitPrice": 10.00 }],
  "discounts": [{ "reason": "MANUAL_DISCOUNT", "amount": 5.00, "note": "Manager approved" }],
  "payments": [{ "method": "CASH", "amount": 25.00 }],
  "invoiceStatus": "PENDING"
}
```

## 11. Response JSON Example (discount field)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FIXED_AMOUNT",
  "reason": "MANUAL_DISCOUNT",
  "value": 5.00,
  "amountApplied": 5.00,
  "note": "Manager approved"
}
```
