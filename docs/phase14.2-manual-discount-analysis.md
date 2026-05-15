# MANUAL_DISCOUNT Implementation Analysis

## Executive Summary

**Recommendation: Implement Option B — MANUAL_DISCOUNT with fixed amount only.**

The infrastructure is already 80% ready. The DB schema, entity, `DiscountType` enum, and `SaleDiscountResponse` all fully support a manual fixed-amount discount. The only missing pieces are one field in `CreateSaleDiscountRequest` and a branch in `SaleService.buildDiscount()`. The total implementation surface is small, low-risk, and maps directly to the existing design in `domain-model.md`. Removing MANUAL_DISCOUNT (Option A) would discard infrastructure that is already in production (the DB `CHECK` constraint already allows `MANUAL_DISCOUNT`), and would require a new Flyway migration to clean up. Implementing percentage support on top (Option C) adds complexity for a case the business has not yet defined a rule for, and can be deferred.

---

## Current State

### Entity — `SaleDiscount`

| Field | Java type | DB column | Nullable | Notes |
|---|---|---|---|---|
| `id` | `UUID` | `id` UUID PK | No | |
| `sale` | `Sale` | `sale_id` UUID FK | No | ManyToOne LAZY |
| `type` | `DiscountType` | `type` VARCHAR(30) | No | `FIXED_AMOUNT` or `PERCENTAGE` |
| `reason` | `DiscountReason` | `reason` VARCHAR(50) | No | `LOYALTY_CARD`, `VOUCHER_10_PERCENT`, `MANUAL_DISCOUNT` |
| `value` | `BigDecimal` | `value` NUMERIC(10,2) | No | Configured input value (amount or %) |
| `amountApplied` | `BigDecimal` | `amount_applied` NUMERIC(10,2) | No | Computed monetary amount deducted |
| `note` | `String` | `note` VARCHAR(500) | Yes | Free text, domain-model says required for MANUAL_DISCOUNT |

The entity has both `value` (the configured input) and `amountApplied` (the computed deduction). For `LOYALTY_CARD` both are `20.00`. For `VOUCHER_10_PERCENT`, `value = 10.00` (the percentage) and `amountApplied = subtotal * 0.10`. This dual-field design already accommodates a fixed-amount manual discount natively (`value = amountApplied = manually entered amount`).

### DB Schema — V6

The `sale_discounts` table in `V6__create_sales_tables.sql` already contains:

```sql
CONSTRAINT sale_discounts_type_check   CHECK (type   IN ('FIXED_AMOUNT', 'PERCENTAGE')),
CONSTRAINT sale_discounts_reason_check CHECK (reason IN ('MANUAL_DISCOUNT', 'LOYALTY_CARD', 'VOUCHER_10_PERCENT')),
CONSTRAINT sale_discounts_value_positive        CHECK (value > 0),
CONSTRAINT sale_discounts_amount_applied_positive CHECK (amount_applied > 0)
```

**No migration is required for Option B.** The `MANUAL_DISCOUNT` reason, `FIXED_AMOUNT` type, and `note` column are all present in the schema today. A `PERCENTAGE` column does not exist — it does not need to; the `value` column stores the percentage figure when type is `PERCENTAGE`.

### DTO Request — `CreateSaleDiscountRequest`

```java
public record CreateSaleDiscountRequest(
        DiscountReason reason,       // required by service, no @NotNull annotation
        @Size(max = 500)
        String note                  // optional, no @NotBlank
) {}
```

**Gaps:**
- No `amount` field — mobile has no way to supply a manual discount value.
- No `type` field — the type for `MANUAL_DISCOUNT` would need to be inferred or sent.
- `note` has no `@NotBlank` validation — cannot enforce note as required for `MANUAL_DISCOUNT` at DTO level without a custom validator.
- `reason` has no `@NotNull` annotation — the null-check is inside the service, not at the bean validation layer.

### Service Logic — `SaleService`

Key points:

- `buildDiscount(subtotal, request)` is a private method called once per discount in the request list.
- `LOYALTY_CARD` → `FIXED_AMOUNT`, value = 20.00, requires subtotal ≥ 25.00.
- `VOUCHER_10_PERCENT` → `PERCENTAGE`, value = 10.00, amountApplied = subtotal × 0.10.
- `MANUAL_DISCOUNT` → falls through to `throw new BusinessException("Unsupported discount reason")`.
- `calculateDiscountTotal()` calls `buildDiscount()` for each discount in the list to sum `amountApplied`.
- `finalTotal = subtotal - discountTotal` is validated to be > 0 after all discounts.
- Payment total must exactly match `finalTotal` — enforced after discounts.
- **Multiple discounts are allowed** — there is no guard preventing two `LOYALTY_CARD` or two `MANUAL_DISCOUNT` entries. This is a potential gap.
- No maximum discount limit is enforced beyond the `finalTotal > 0` check.

### Response DTO — `SaleDiscountResponse`

```java
public record SaleDiscountResponse(
        UUID id,
        DiscountType type,
        DiscountReason reason,
        BigDecimal value,
        BigDecimal amountApplied,
        String note
) {}
```

The response DTO is **fully ready**. It exposes `type`, `reason`, `value`, `amountApplied`, and `note`. Mobile can display the manual discount amount from `amountApplied` and the note from `note` without any changes.

### Existing Tests

| Test | Class | Covers |
|---|---|---|
| `should_create_sale_with_loyalty_card_discount_when_subtotal_is_at_least_25` | `SaleServiceTest` | LOYALTY_CARD happy path |
| `should_throw_when_loyalty_card_discount_subtotal_is_less_than_25` | `SaleServiceTest` | LOYALTY_CARD minimum subtotal |
| `should_create_sale_with_voucher_10_percent_discount` | `SaleServiceTest` | VOUCHER_10_PERCENT calculation |
| `should_throw_when_discount_reason_is_null` | `SaleServiceTest` | null reason guard |
| **`should_throw_when_discount_reason_is_manual_discount_for_now`** | `SaleServiceTest` | **explicitly documents the broken state** |

**No integration test covers any discount path.** `SaleFlowIntegrationTest` tests only sales without discounts (Test 1), or infrastructure errors (Tests 2, 3, 4, 5, 6, 7, 8). No test sends a discount in the HTTP request body.

---

## Option A — Remove MANUAL_DISCOUNT from MVP Contract

### What it means

Remove `MANUAL_DISCOUNT` from the `DiscountReason` enum. Mobile will never see this option. The existing `BusinessException("Unsupported discount reason")` behavior disappears because the enum value no longer exists.

### Files affected

| File | Change |
|---|---|
| `DiscountReason.java` | Remove `MANUAL_DISCOUNT` entry |
| `V6__create_sales_tables.sql` | **Cannot be modified** — Flyway migration is immutable |
| New migration required | `ALTER TABLE sale_discounts DROP CONSTRAINT sale_discounts_reason_check; ALTER TABLE sale_discounts ADD CONSTRAINT sale_discounts_reason_check CHECK (reason IN ('LOYALTY_CARD', 'VOUCHER_10_PERCENT'));` |
| `SaleServiceTest.java` | Delete `should_throw_when_discount_reason_is_manual_discount_for_now` (enum value no longer exists) |
| `domain-model.md` | Remove MANUAL_DISCOUNT documentation |

### Tests affected

One unit test deleted. No new tests needed.

### Pros

- Zero new production code.
- Simplifies the discount model for MVP.
- No ambiguity about what mobile should send.

### Cons

- **Requires a new Flyway migration** to update the DB check constraint — infra impact despite being a "removal."
- Throws away infrastructure that is already designed and in place.
- If the business wants MANUAL_DISCOUNT in Phase 15 or later, it must be re-added everywhere.
- The domain model explicitly defines MANUAL_DISCOUNT behavior — removing it creates a design/docs divergence.
- Does not eliminate the test — the test must be deleted, which hides the design decision.

### Risk level

**LOW** for code correctness. **MEDIUM** for design continuity — removing infrastructure that was intentionally designed.

---

## Option B — MANUAL_DISCOUNT with Fixed Amount Only

### What it means

Mobile sends a `reason: "MANUAL_DISCOUNT"`, `type: "FIXED_AMOUNT"`, `amount: X.XX`, `note: "..."`. The server validates the amount, computes `amountApplied = amount`, and stores the discount. `note` is required.

### Files affected

| File | Change |
|---|---|
| `CreateSaleDiscountRequest.java` | Add `@NotNull @Positive BigDecimal amount` and `@NotBlank @Size(max=500) String note` with conditional semantics (see validation section) |
| `SaleService.java` | Add `MANUAL_DISCOUNT` branch in `buildDiscount()` |
| `SaleServiceTest.java` | Rename/replace `should_throw_when_discount_reason_is_manual_discount_for_now` with success + failure tests |
| `SaleFlowIntegrationTest.java` | Add integration test for manual discount over HTTP |

### DB impact

**None.** V6 already has `MANUAL_DISCOUNT` in the check constraint, the `type` column supports `FIXED_AMOUNT`, and the `note` column exists and is nullable (the requirement is enforced at service level).

### DTO shape

**Request:**

```json
{
  "reason": "MANUAL_DISCOUNT",
  "type": "FIXED_AMOUNT",
  "amount": 5.00,
  "note": "Manager approved discount"
}
```

For existing discounts (`LOYALTY_CARD`, `VOUCHER_10_PERCENT`), `type` and `amount` are **ignored by the service** — they are computed. Mobile sends them as null or omits them entirely. The service only reads them for `MANUAL_DISCOUNT`.

**Alternative DTO design** — avoid adding `type` to the request and infer it from reason:

```json
{
  "reason": "MANUAL_DISCOUNT",
  "amount": 5.00,
  "note": "Manager approved discount"
}
```

This is simpler and preferred: the `type` for MANUAL_DISCOUNT is always `FIXED_AMOUNT` in this option. Mobile does not need to know about `DiscountType`. The service sets `type = FIXED_AMOUNT` internally.

**Recommended simplified request:**

```json
{
  "reason": "MANUAL_DISCOUNT",
  "amount": 5.00,
  "note": "Manager approved discount"
}
```

**Response (unchanged):**

```json
{
  "id": "uuid",
  "type": "FIXED_AMOUNT",
  "reason": "MANUAL_DISCOUNT",
  "value": 5.00,
  "amountApplied": 5.00,
  "note": "Manager approved discount"
}
```

### Validation rules

| Rule | Enforcement point |
|---|---|
| `amount` is required when `reason = MANUAL_DISCOUNT` | Service: `if (request.reason() == MANUAL_DISCOUNT && request.amount() == null)` throw BusinessException |
| `amount` must be positive (> 0) | Service: `if (amount.compareTo(ZERO) <= 0)` throw BusinessException |
| `amount` must not exceed subtotal | Service: `if (amount.compareTo(subtotal) >= 0)` throw BusinessException |
| `note` must be non-blank when `reason = MANUAL_DISCOUNT` | Service: `if (note is null or blank)` throw BusinessException |
| `note` max 500 chars | DTO: `@Size(max = 500)` already exists |
| `finalTotal` must remain > 0 after all discounts | Service: already validated (line `if (finalTotal.compareTo(ZERO) <= 0)`) |
| Multiple `MANUAL_DISCOUNT` per sale | **Disallow**: service should check existing discount list for duplicate MANUAL_DISCOUNT reason, or simply allow it and rely on the finalTotal > 0 guard — decision needed (see section 7) |

**Key decision on conditional validation in DTO:** Java records cannot have conditional `@NotNull` per field without a custom class-level `@Constraint`. The cleanest approach is to keep `amount` as nullable in the DTO (no `@NotNull` on it) and enforce the rule inside `buildDiscount()` in the service. This is consistent with how `note` is currently handled for LOYALTY_CARD (optional by DTO, used if provided).

### Service change in `buildDiscount()`

```java
if (request.reason() == DiscountReason.MANUAL_DISCOUNT) {
    if (request.amount() == null || request.amount().compareTo(ZERO) <= 0) {
        throw new BusinessException("Manual discount amount must be greater than zero");
    }
    if (request.amount().compareTo(subtotal) >= 0) {
        throw new BusinessException("Manual discount amount must be less than sale subtotal");
    }
    if (request.note() == null || request.note().isBlank()) {
        throw new BusinessException("Manual discount requires a note");
    }
    BigDecimal amount = toMoney(request.amount());
    discount.setType(DiscountType.FIXED_AMOUNT);
    discount.setValue(amount);
    discount.setAmountApplied(amount);
    return discount;
}
```

### Tests needed

**Unit tests (SaleServiceTest):**

| Test | Verifies |
|---|---|
| `should_create_sale_with_manual_discount_fixed_amount` | Happy path: amount=5, note present, subtotal=30, finalTotal=25 |
| `should_throw_when_manual_discount_amount_is_null` | Missing amount |
| `should_throw_when_manual_discount_amount_is_zero` | Zero amount |
| `should_throw_when_manual_discount_amount_equals_subtotal` | Amount = subtotal → would make finalTotal = 0 |
| `should_throw_when_manual_discount_note_is_blank` | Missing note |
| `should_throw_when_manual_discount_note_is_null` | Null note |
| `should_create_sale_combining_loyalty_card_and_manual_discount` | Combination works |
| Replace `should_throw_when_discount_reason_is_manual_discount_for_now` | Remove this test — it documents broken behavior |

**Integration tests (SaleFlowIntegrationTest):**

| Test | Verifies |
|---|---|
| `should_create_sale_with_manual_discount` | POST /api/sales with MANUAL_DISCOUNT in HTTP body → 201, discounts array populated |
| `should_reject_manual_discount_without_note` | POST /api/sales MANUAL_DISCOUNT, no note → 400 |
| `should_reject_manual_discount_without_amount` | POST /api/sales MANUAL_DISCOUNT, no amount → 400 |

### Pros

- **No migration needed** — DB is already ready.
- Minimal code change: 1 DTO field added, 1 service branch added.
- Aligns with `domain-model.md` specification (note required, fixed amount).
- `SaleDiscountResponse` is already ready — no response changes.
- Simple and well-bounded: one reason, one type, one validation path.
- STAFF can apply it immediately during sale creation without admin approval flow.

### Cons

- `note` enforcement is at service level, not DTO annotation level — minor inconsistency with the rest of the DTO validation pattern.
- Does not prevent two MANUAL_DISCOUNT discounts on the same sale (a future guard may be needed).
- `amount` field added to `CreateSaleDiscountRequest` will be ignored for LOYALTY_CARD and VOUCHER_10_PERCENT — mobile must know not to send it for those reasons, or the service must silently ignore it. This requires clear API documentation.

### Risk level

**LOW.** The infrastructure is already in place. The change is additive and confined to two files. The existing `finalTotal > 0` guard is a safety net.

---

## Option C — MANUAL_DISCOUNT with Fixed Amount + Percentage

### What it means

Mobile can send either a fixed-amount discount or a percentage discount when using `MANUAL_DISCOUNT`. The `type` field becomes meaningful in the request.

### Files affected

Same as Option B plus:

| File | Change |
|---|---|
| `CreateSaleDiscountRequest.java` | Add `@NotNull DiscountType type` in addition to `amount` |
| `SaleService.java` | Branch on both `reason == MANUAL_DISCOUNT` and `type` |

### DB impact

**None** — same as Option B. Both `FIXED_AMOUNT` and `PERCENTAGE` are already in the DB check constraint.

### DTO shape

```json
{
  "reason": "MANUAL_DISCOUNT",
  "type": "FIXED_AMOUNT",
  "amount": 5.00,
  "note": "Manager approved"
}
```

or

```json
{
  "reason": "MANUAL_DISCOUNT",
  "type": "PERCENTAGE",
  "amount": 15.00,
  "note": "15% weekend promotion"
}
```

The `amount` field carries either the fixed amount (when `FIXED_AMOUNT`) or the percentage value (when `PERCENTAGE`). No separate `percentage` field is needed — this is consistent with how `value` stores both in the entity.

### Validation rules

All rules from Option B, plus:

| Rule | Enforcement point |
|---|---|
| `type` required when `reason = MANUAL_DISCOUNT` | Service |
| When `type = PERCENTAGE`, `amount` must be in range (0, 100) exclusive | Service |
| When `type = PERCENTAGE`, computed `amountApplied = subtotal × (amount / 100)` | Service |
| Combined computed amount must not exceed subtotal | Service |

### Tests needed

All tests from Option B, plus:

| Test | Verifies |
|---|---|
| `should_create_sale_with_manual_discount_percentage` | PERCENTAGE type, amount=15, subtotal=100, finalTotal=85 |
| `should_throw_when_manual_discount_percentage_is_above_100` | Percentage > 100 |
| `should_throw_when_manual_discount_type_is_null` | Missing type |
| Integration: `should_create_sale_with_manual_discount_percentage` | HTTP test for percentage path |

### Pros

- Maximum flexibility for the store.
- One implementation covers both business cases.
- `DiscountType` enum was always designed for this.

### Cons

- More validation branches, more tests, more edge cases.
- **No business rule currently defines what percentage values are acceptable** — this is not in `business-rules.md` or `domain-model.md`.
- `type` must now be required in the DTO for MANUAL_DISCOUNT but must be null/ignored for other reasons — adds conceptual complexity.
- Higher risk of specification gaps: is 99% discount allowed? Is combining a 50% manual discount with LOYALTY_CARD allowed? These questions are not answered.
- Over-engineering for MVP: the percentage use case has not been requested.

### Risk level

**MEDIUM.** The code surface is larger and the business rules for percentage are undefined.

---

## Recommended Approach

**Implement Option B — Fixed Amount MANUAL_DISCOUNT.**

Reasons:

1. The DB is already ready — `MANUAL_DISCOUNT`, `FIXED_AMOUNT`, and `note` are all in V6. Zero migration cost.
2. The entity, enum, and response DTO are all complete — only the request DTO and service need changes.
3. The domain model explicitly specifies this behavior: fixed amount, note required.
4. Option A would require a migration (to drop `MANUAL_DISCOUNT` from the DB check constraint) and would discard ready infrastructure.
5. Option C introduces undefined business rules (percentage bounds, combination rules). Defer until the business defines them.
6. The implementation scope is minimal: one `amount` field added to the request DTO, one `if` branch in `buildDiscount()`, plus unit and integration tests.

**The risk of shipping this in Phase 14.2 is low. The risk of leaving it broken in production is higher — mobile clients could serialize `MANUAL_DISCOUNT` from the enum and get a confusing 400 at runtime.**

---

## Proposed API Contract

### Request

`POST /api/sales`

```json
{
  "items": [
    {
      "productName": "Café",
      "unitPrice": 30.00,
      "quantity": 1
    }
  ],
  "discounts": [
    {
      "reason": "MANUAL_DISCOUNT",
      "amount": 5.00,
      "note": "Manager approved discount for regular customer"
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
```

Notes for mobile:
- `amount` is required for `MANUAL_DISCOUNT`, must be positive, and must be less than the sale subtotal.
- `note` is required for `MANUAL_DISCOUNT`, max 500 characters.
- `amount` is **not sent** for `LOYALTY_CARD` or `VOUCHER_10_PERCENT` — those are computed by the server.
- `finalTotal = subtotal - discountTotal`. Mobile must compute this to match the payment amount before submitting.

### Response (HTTP 201)

```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "shiftId": "...",
    "staffId": "...",
    "storeId": "...",
    "status": "ACTIVE",
    "invoiceStatus": "PENDING",
    "subtotalAmount": 30.00,
    "discountTotalAmount": 5.00,
    "finalTotalAmount": 25.00,
    "items": [
      {
        "productName": "Café",
        "quantity": 1,
        "unitPrice": 30.00,
        "lineTotal": 30.00
      }
    ],
    "discounts": [
      {
        "id": "...",
        "type": "FIXED_AMOUNT",
        "reason": "MANUAL_DISCOUNT",
        "value": 5.00,
        "amountApplied": 5.00,
        "note": "Manager approved discount for regular customer"
      }
    ],
    "payments": [
      {
        "method": "CASH",
        "amount": 25.00
      }
    ]
  }
}
```

### Error responses

| Condition | HTTP | Message |
|---|---|---|
| `amount` is null | 400 | `"Manual discount amount must be greater than zero"` |
| `amount` is zero or negative | 400 | `"Manual discount amount must be greater than zero"` |
| `amount` ≥ subtotal | 400 | `"Manual discount amount must be less than sale subtotal"` |
| `note` is blank or null | 400 | `"Manual discount requires a note"` |
| `finalTotal` ≤ 0 after all discounts | 400 | `"Sale final total must be greater than zero"` |

---

## Test Plan

### Unit tests — `SaleServiceTest`

| # | Test name | What it verifies |
|---|---|---|
| 1 | `should_create_sale_with_manual_discount_fixed_amount` | Happy path: amount=5.00, note="...", subtotal=30.00, finalTotal=25.00, type=FIXED_AMOUNT stored |
| 2 | `should_throw_when_manual_discount_amount_is_null` | BusinessException("Manual discount amount must be greater than zero") |
| 3 | `should_throw_when_manual_discount_amount_is_zero` | BusinessException — zero is not a valid discount |
| 4 | `should_throw_when_manual_discount_amount_equals_subtotal` | BusinessException("Manual discount amount must be less than sale subtotal") |
| 5 | `should_throw_when_manual_discount_amount_exceeds_subtotal` | Same exception when amount > subtotal |
| 6 | `should_throw_when_manual_discount_note_is_null` | BusinessException("Manual discount requires a note") |
| 7 | `should_throw_when_manual_discount_note_is_blank` | BusinessException — blank note is not accepted |
| 8 | `should_create_sale_combining_loyalty_card_and_manual_discount` | subtotal=50, LOYALTY_CARD=-20, MANUAL_DISCOUNT=-5, finalTotal=25, payment=25 |
| 9 | Delete `should_throw_when_discount_reason_is_manual_discount_for_now` | Behavior changed; test documented a bug, not a requirement |

### Integration tests — `SaleFlowIntegrationTest`

| # | Test name | What it verifies |
|---|---|---|
| 1 | `should_create_sale_with_manual_discount` | POST /api/sales with MANUAL_DISCOUNT in JSON body → 201, discounts array in response has type=FIXED_AMOUNT, reason=MANUAL_DISCOUNT, amountApplied=expected value, note preserved |
| 2 | `should_reject_manual_discount_without_note` | POST with `"reason":"MANUAL_DISCOUNT"`, `"amount":5.00`, no `note` → 400 with message "Manual discount requires a note" |
| 3 | `should_reject_manual_discount_without_amount` | POST with `"reason":"MANUAL_DISCOUNT"`, no `amount` → 400 with message "Manual discount amount must be greater than zero" |

Total new tests: **8 unit + 3 integration = 11 new tests** (1 old unit test deleted). New total: 247 - 1 + 11 = **257 tests**.
