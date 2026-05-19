# Domain Model

This document describes the initial domain entities for Shift Control.

The app is an internal sales and shift closing control system. It is not a POS, inventory system, or billing system.

---

## Entities Overview

| Entity | Module | Description |
|---|---|---|
| `Store` | `stores` | Represents a physical store location |
| `User` | `users` | Represents a staff member or admin |
| `Shift` | `shifts` | Represents an open or closed work shift |
| `Sale` | `sales` | Represents a completed, paid sale |
| `SaleItem` | `sales` | Represents a product line within a sale |
| `SaleDiscount` | `sales` | Represents a discount applied to a sale |
| `SalePayment` | `sales` | Represents a payment method used in a sale |
| `ShiftClosure` | `closures` | Represents the formal closing of a shift |
| `Incident` | `incidents` | Represents a problem, difference, or admin note |
| `WeeklyAdminReview` | `reports` | Represents the admin's weekly review per staff member |

---

## 1. Store

Represents a physical store location.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `name` | `String` | Store display name |
| `address` | `String` | Physical address |
| `baseCashAmount` | `BigDecimal` | Base cash amount kept in the register (e.g. 103 EUR) |
| `active` | `boolean` | Soft-delete flag |
| `createdAt` | `Instant` | Creation timestamp |

### Business Rules

- Each store can have a different `baseCashAmount`.
- Stores are never physically deleted — they are deactivated (`active = false`).

---

## 2. User

Represents a staff member or administrator.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `fullName` | `String` | Full display name |
| `username` | `String` | Unique login identifier |
| `email` | `String` | Optional contact email |
| `pinHash` | `String` | Hashed 6-digit PIN — STAFF only |
| `passwordHash` | `String` | Hashed password — ADMIN only |
| `role` | `Role` | `STAFF` or `ADMIN` |
| `storeId` | `UUID` | FK to `Store` — nullable for global admins |
| `active` | `boolean` | Soft-delete flag |
| `createdAt` | `Instant` | Creation timestamp |

### Enums

```java
enum Role { STAFF, ADMIN }
```

### Business Rules

- `STAFF` authenticates with a 6-digit PIN (`pinHash`).
- `ADMIN` authenticates with a password (`passwordHash`).
- A global admin may have `storeId = null`.
- `STAFF` must always have a `storeId` assigned.
- Users are never physically deleted — they are deactivated (`active = false`).
- Plain PINs and passwords are never stored — always hashed.

---

## 3. Shift

Represents a work shift opened by a staff member.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `staffId` | `UUID` | FK to `User` (STAFF) |
| `storeId` | `UUID` | FK to `Store` |
| `type` | `ShiftType` | `DAY` or `NIGHT` |
| `status` | `ShiftStatus` | `OPEN` or `CLOSED` |
| `openedAt` | `Instant` | When the shift was opened |
| `closedAt` | `Instant` | When the shift was closed — nullable while open |
| `closedBy` | `UUID` | FK to `User` who closed the shift — nullable while open |

### Enums

```java
enum ShiftType   { DAY, NIGHT }
enum ShiftStatus { OPEN, CLOSED }
```

### Business Rules

- A staff member cannot have more than one `OPEN` shift at a time.
- The staff member opens the shift manually.
- If a shift is forgotten, it remains `OPEN`. The system surfaces it as overdue in the UI — no extra status needed for the MVP.
- An admin can close a forgotten shift on behalf of the staff member (`closedBy` records who closed it).
- A `CLOSED` shift cannot be reopened.

---

## 4. Sale

Represents a completed, paid sale registered during an open shift.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `shiftId` | `UUID` | FK to `Shift` |
| `staffId` | `UUID` | FK to `User` (STAFF) |
| `storeId` | `UUID` | FK to `Store` |
| `status` | `SaleStatus` | `ACTIVE` or `CANCELLED` |
| `invoiceStatus` | `InvoiceStatus` | `PENDING` or `INVOICED` |
| `subtotal` | `BigDecimal` | Sum of all line totals before discounts |
| `discountTotal` | `BigDecimal` | Sum of all applied discounts |
| `finalTotal` | `BigDecimal` | `subtotal - discountTotal` |
| `note` | `String` | Optional internal note |
| `cancelReason` | `String` | Required when `status = CANCELLED` |
| `createdAt` | `Instant` | Creation timestamp |
| `updatedAt` | `Instant` | Last update timestamp |
| `cancelledAt` | `Instant` | Cancellation timestamp — nullable |

### Enums

```java
enum SaleStatus    { ACTIVE, CANCELLED }
enum InvoiceStatus { PENDING, INVOICED }
```

### Business Rules

- A sale can only be created while the associated shift is `OPEN`.
- A sale can be edited while the shift is `OPEN`.
- Cancelled sales are never physically deleted — `status = CANCELLED`.
- A cancellation reason (`cancelReason`) is mandatory when cancelling.
- Cancelled sales do not count toward shift closing totals.
- `updatedAt` is always recorded for audit trail purposes.

---

## 5. SaleItem

Represents a product line within a sale.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `saleId` | `UUID` | FK to `Sale` |
| `productName` | `String` | Manually typed product name |
| `unitPrice` | `BigDecimal` | Price per unit |
| `quantity` | `int` | Integer quantity (1–50 in UI) |
| `lineTotal` | `BigDecimal` | `unitPrice × quantity` |

### Business Rules

- `quantity` must be a positive integer.
- `productName` is typed manually — there is no product catalog in the MVP.
- `lineTotal = unitPrice × quantity` — calculated and stored.
- Discounts are not applied at the item level in the MVP.

---

## 6. SaleDiscount

Represents a discount applied to a sale. Modelled as a separate entity to allow multiple discounts per sale.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `saleId` | `UUID` | FK to `Sale` |
| `type` | `DiscountType` | `FIXED_AMOUNT` or `PERCENTAGE` |
| `reason` | `DiscountReason` | Why the discount was applied |
| `value` | `BigDecimal` | The configured discount value (amount or %) |
| `calculatedAmount` | `BigDecimal` | Actual monetary amount deducted |
| `note` | `String` | Required when `reason = MANUAL_DISCOUNT` |

### Enums

```java
enum DiscountType {
    FIXED_AMOUNT,
    PERCENTAGE
}

enum DiscountReason {
    MANUAL_DISCOUNT,
    LOYALTY_CARD,
    VOUCHER_10_PERCENT
}
```

### Business Rules

- `VOUCHER_10_PERCENT`: 10% percentage discount — `calculatedAmount` is computed automatically.
- `LOYALTY_CARD`: always a fixed €20 deduction.
- `MANUAL_DISCOUNT`: requires a `note` explaining the reason.
- The sale `finalTotal` must remain greater than zero after all discounts.

---

## 7. SalePayment

Represents a payment method used to pay for a sale.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `saleId` | `UUID` | FK to `Sale` |
| `method` | `PaymentMethod` | The payment method used |
| `amount` | `BigDecimal` | Amount paid via this method |

### Enums

```java
enum PaymentMethod { CASH, MB, GLOVO_ONLINE, GLOVO_CASH }
```

### Business Rules

- A sale can be paid with multiple methods (split payment).
- The same payment method cannot appear more than once within a single sale.
- The sum of all `SalePayment.amount` entries must equal the sale `finalTotal`.
- `CASH` and `GLOVO_CASH` affect physical cash in the register.
- `MB` is tracked separately and matched against the card terminal closing amount.
- `GLOVO_ONLINE` is tracked separately and does not affect physical cash.

---

## 8. ShiftClosure

Represents the formal closing of a shift, recording confirmed totals by payment method.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `shiftId` | `UUID` | FK to `Shift` |
| `staffId` | `UUID` | FK to `User` (STAFF) |
| `storeId` | `UUID` | FK to `Store` |
| `totalCash` | `BigDecimal` | Calculated cash total from active sales |
| `totalMb` | `BigDecimal` | Calculated MB total from active sales |
| `totalGlovoOnline` | `BigDecimal` | Calculated Glovo Online total from active sales |
| `totalGlovoCash` | `BigDecimal` | Calculated Glovo Cash total from active sales |
| `totalSales` | `BigDecimal` | Total of all active sales (`finalTotal` sum) |
| `pendingInvoiceTotal` | `BigDecimal` | Total of active sales with `invoiceStatus = PENDING` |
| `expectedPhysicalCash` | `BigDecimal` | `baseCashAmount + totalCash + totalGlovoCash` |
| `confirmedCashAmount` | `BigDecimal` | Cash amount physically counted by staff |
| `confirmedMbAmount` | `BigDecimal` | MB amount confirmed from card terminal |
| `confirmedGlovoCashAmount` | `BigDecimal` | Glovo Cash amount confirmed by staff |
| `status` | `ClosureStatus` | `CLOSED_OK` or `CLOSED_WITH_INCIDENT` |
| `createdAt` | `Instant` | When the closure was recorded |

### Enums

```java
enum ClosureStatus { CLOSED_OK, CLOSED_WITH_INCIDENT }
```

### Business Rules

- Totals are calculated from `ACTIVE` sales only — cancelled sales are excluded.
- Staff confirms physical counts (`confirmedCashAmount`, `confirmedMbAmount`, `confirmedGlovoCashAmount`).
- `GLOVO_ONLINE` is informational only — no physical confirmation required.
- If confirmed amounts differ from calculated totals, the closure is marked `CLOSED_WITH_INCIDENT`.

---

## 9. Incident

Represents a problem, cash difference, or administrative note linked to a sale, shift closure, or weekly review.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `type` | `IncidentType` | Category of the incident |
| `status` | `IncidentStatus` | `OPEN` or `RESOLVED` |
| `note` | `String` | Description of the incident |
| `amountDifference` | `BigDecimal` | Monetary difference — optional |
| `responsibleUserId` | `UUID` | FK to `User` — who is accountable |
| `saleId` | `UUID` | FK to `Sale` — optional |
| `shiftClosureId` | `UUID` | FK to `ShiftClosure` — optional |
| `weeklyReviewId` | `UUID` | FK to `WeeklyAdminReview` — optional |
| `createdAt` | `Instant` | Creation timestamp |
| `resolvedAt` | `Instant` | Resolution timestamp — nullable |
| `resolutionNote` | `String` | Note added when resolving — nullable |

### Enums

```java
enum IncidentType {
    CASH_DIFFERENCE,
    MB_DIFFERENCE,
    GLOVO_ISSUE,
    WRONG_CHARGE,
    PENDING_INVOICE,
    OTHER
}

enum IncidentStatus { OPEN, RESOLVED }
```

### Business Rules

- An incident can be linked to a sale, a shift closure, or a weekly review (all optional).
- `amountDifference` is optional — some incidents are qualitative.
- An incident can be resolved after the fact, recording `resolvedAt` and `resolutionNote`.
- Incidents are never physically deleted.

---

## 10. WeeklyAdminReview

Represents the admin's weekly review of a staff member's activity at a store.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `storeId` | `UUID` | FK to `Store` |
| `staffId` | `UUID` | FK to `User` (STAFF) |
| `weekStartDate` | `LocalDate` | First day of the reviewed week |
| `weekEndDate` | `LocalDate` | Last day of the reviewed week |
| `totalCash` | `BigDecimal` | Sum of cash across all shift closures in the week |
| `totalMb` | `BigDecimal` | Sum of MB across all shift closures in the week |
| `totalGlovoOnline` | `BigDecimal` | Sum of Glovo Online across the week |
| `totalGlovoCash` | `BigDecimal` | Sum of Glovo Cash across the week |
| `totalSales` | `BigDecimal` | Total sales amount for the week |
| `status` | `WeeklyReviewStatus` | `REVIEWED_OK` or `REVIEWED_WITH_INCIDENT` |
| `reviewedByAdminId` | `UUID` | FK to `User` (ADMIN) who performed the review |
| `reviewedAt` | `Instant` | When the review was completed |
| `note` | `String` | Optional admin note |

### Enums

```java
enum WeeklyReviewStatus { REVIEWED_OK, REVIEWED_WITH_INCIDENT }
```

### Business Rules

- Weekly review is per staff member, not per store globally.
- Historical reviews are preserved and never deleted.
- Admin marks the review as `REVIEWED_OK` or `REVIEWED_WITH_INCIDENT`.
- If issues are found, the admin creates an `Incident` linked to the review.

---

## Notes on Future Scope

- **Monthly closure**: Not an entity in the MVP. The monthly summary will be a calculated report (sum of sales and closures for the month, grouped by store, staff, and payment method). If an admin needs to "officially close a month", a `MonthlyAdminReview` entity can be introduced later.
- **Audit log**: `updatedAt` is tracked on `Sale` for now. A dedicated `AuditLog` entity can be added later to record exactly who changed what and when.
- **Product catalog**: Products are entered manually in the MVP. A catalog can be introduced in a future iteration.