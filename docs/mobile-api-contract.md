# Mobile API Contract

**Shift Control — Phase 14**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Auth and Session Handling](#2-auth-and-session-handling)
3. [STAFF Flow](#3-staff-flow)
4. [Close Shift Flow](#4-close-shift-flow)
5. [Sales and Discounts](#5-sales-and-discounts)
6. [ADMIN Flow](#6-admin-flow)
7. [Error Handling Contract](#7-error-handling-contract)
8. [Known Deferred Items](#8-known-deferred-items)

---

## 1. Overview

All responses use the same envelope:

```json
{ "success": true,  "message": "...", "data": {} }
{ "success": false, "message": "...", "data": null }
```

All protected endpoints require `Authorization: Bearer <accessToken>`.

| Role | Auth method | `storeId` |
|---|---|---|
| `STAFF` | username + 6-digit PIN | always set |
| `ADMIN` | username + password | `null` (global) |

**Use HTTP status code + endpoint context for app logic. Do not match `message` strings, except where noted explicitly.**

---

## 2. Auth and Session Handling

### POST /api/auth/staff/login

```json
{ "username": "sara.staff", "pin": "123456" }
```

**200**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": {
      "id": "3fa85f64-...",
      "username": "sara.staff",
      "fullName": "Sara Staff",
      "role": "STAFF",
      "storeId": "9b2d4f1c-..."
    }
  }
}
```

| Status | Meaning |
|---|---|
| 400 `Invalid credentials` | Wrong username, wrong PIN, or inactive account — intentionally indistinguishable |

---

### POST /api/auth/admin/login

```json
{ "username": "admin.user", "password": "securePassword123" }
```

Same response shape. `user.role = "ADMIN"`, `user.storeId = null`.

| Status | Meaning |
|---|---|
| 400 `Invalid credentials` | Wrong username, wrong password, or inactive account |

---

### GET /api/auth/me

Returns the current user. Used to restore session on app launch.

**200** — returns `user` object (same fields as login response `data.user`).

| Status | Meaning |
|---|---|
| 401 | Token missing or expired — clear SecureStore and redirect to login |

---

### Token storage and session restore

Store `accessToken` in **Expo SecureStore** (never AsyncStorage).

On app launch:
1. Read token from SecureStore.
2. Call `GET /api/auth/me`.
3. 200 → session valid, navigate to home.
4. 401 → clear token, navigate to login.

---

## 3. STAFF Flow

### Splash / Session Restore
See session restore flow above.

---

### Login
`POST /api/auth/staff/login` — store token, navigate to home.

---

### Home / Current Shift

`GET /api/shifts/current` · STAFF token

**200**
```json
{
  "data": {
    "id": "7c1e3f5b-...", "staffId": "3fa85f64-...", "storeId": "9b2d4f1c-...",
    "type": "DAY", "status": "OPEN",
    "openedAt": "2026-05-15T08:00:00Z", "closedAt": null, "closedById": null
  }
}
```

| Status | Meaning |
|---|---|
| **404** `Open shift not found` | **No active shift — navigate to Open Shift screen, not an error screen** |

> This is the only documented case where a 404 must be treated as a normal state, not a failure.

---

### Open Shift

`POST /api/shifts/open` · STAFF token

```json
{ "type": "DAY" }
```

`type`: `DAY` | `NIGHT`. Returns the new shift (same shape as above). **201.**

| Status | Meaning |
|---|---|
| 400 `Staff already has an open shift` | One open shift at a time |

---

### List Current Shift Sales

`GET /api/sales?shiftId=current` · STAFF or ADMIN token

Returns sales ordered by most recent first. Each sale includes `items`, `discounts`, `payments`.

| Status | Meaning |
|---|---|
| 400 `shiftId is required` | Param missing |
| 400 `Staff has no open shift` | No open shift for `shiftId=current` |

---

### List Sales by Shift UUID

`GET /api/sales?shiftId=<UUID>` · STAFF (own shift) or ADMIN (any shift)

Same response shape as above.

| Status | Meaning |
|---|---|
| 400 `Invalid shiftId` | Not a valid UUID |
| 400 `You are not allowed to access this shift` | STAFF accessing another staff's shift |
| 404 `Shift not found` | UUID doesn't match any shift |

---

### Sale Detail

`GET /api/sales/{id}` · STAFF (own) or ADMIN

Key response fields: `id`, `shiftId`, `staffId`, `storeId`, `status` (`ACTIVE`|`CANCELLED`), `invoiceStatus` (`PENDING`|`INVOICED`), `subtotalAmount`, `discountTotalAmount`, `finalTotalAmount`, `note`, `items[]`, `discounts[]`, `payments[]`, `createdAt`, `updatedAt`, `cancelledAt`, `cancelledReason`.

| Status | Meaning |
|---|---|
| 400 `You are not allowed to access this sale` | STAFF accessing another's sale |
| 404 `Sale not found` | — |

---

### Cancel Sale

`PATCH /api/sales/{id}/cancel` · STAFF (own) or ADMIN

```json
{ "reason": "Customer changed their mind" }
```

`reason` required. Returns updated sale with `status: "CANCELLED"`.

| Status | Meaning |
|---|---|
| 400 `You are not allowed to access this sale` | — |
| 400 `Closed shift sale cannot be cancelled` | Shift already closed |
| 400 `Sale is already cancelled` | — |
| 404 `Sale not found` | — |

---

### Mark Sale as Invoiced

`PATCH /api/sales/{id}/invoice` · STAFF (own) or ADMIN — no body.

Moves `invoiceStatus` PENDING → INVOICED. One-way.

| Status | Meaning |
|---|---|
| 400 `You are not allowed to access this sale` | — |
| 400 `Sale is already invoiced` | — |
| 400 `Cancelled sale cannot be invoiced` | — |
| 404 `Sale not found` | — |

---

### Close Preview / Close Shift

See [Section 4 — Close Shift Flow](#4-close-shift-flow).

---

### Create Incident

`POST /api/incidents` · STAFF or ADMIN · **201**

```json
{
  "type": "CASH_DIFFERENCE",
  "title": "Cash short by 5 EUR",
  "description": "Register had 5 EUR less than expected at close",
  "severity": "MEDIUM",
  "shiftId": "7c1e3f5b-..."
}
```

`type`: `CASH_DIFFERENCE` | `MB_DIFFERENCE` | `GLOVO_ISSUE` | `WRONG_CHARGE` | `PENDING_INVOICE` | `OPERATIONAL_NOTE`
`severity`: `LOW` | `MEDIUM` | `HIGH`
`shiftId`, `closureId`, `saleId` are optional links.

---

### List Incidents

`GET /api/incidents` · STAFF (own only) or ADMIN (all)

| Param | Type | Roles | Description |
|---|---|---|---|
| `status` | `OPEN` \| `RESOLVED` | ALL | Filter by incident status |
| `storeId` | UUID | ADMIN only | Filter by store (STAFF ignored) |
| `staffId` | UUID | ADMIN only | Filter by staff member (STAFF ignored) |
| `shiftId` | UUID | ALL | Filter by shift |
| `closureId` | UUID | ALL | Filter by closure |
| `saleId` | UUID | ALL | Filter by sale |

All params are optional. STAFF callers always see only their own incidents regardless of any filter param.

---

## 4. Close Shift Flow

Two steps: **preview (read-only) → confirm and close**.

### Step 1 — GET /api/shifts/{id}/close-preview

**Auth:** STAFF (own open shift) or ADMIN.

Calculates totals without persisting anything. Does not close the shift.

**200**
```json
{
  "data": {
    "shiftId": "7c1e3f5b-...",
    "staffId": "3fa85f64-...",
    "staffName": "Sara Staff",
    "storeId": "9b2d4f1c-...",
    "storeName": "Main Store",
    "totalCash": "150.00",
    "totalMb": "80.00",
    "totalGlovoOnline": "30.00",
    "totalGlovoCash": "20.00",
    "totalSales": "280.00",
    "pendingInvoiceTotal": "50.00",
    "cashToWithdraw": "170.00",
    "expectedPhysicalCash": "273.00"
  }
}
```

| Field | Formula |
|---|---|
| `cashToWithdraw` | `totalCash + totalGlovoCash` |
| `expectedPhysicalCash` | `store.baseCashAmount (103 EUR) + cashToWithdraw` |

| Status | Meaning |
|---|---|
| 400 `You are not allowed to access this shift` | — |
| 400 `Shift is already closed` | — |
| 404 `Shift not found` | — |

---

### Step 2 — POST /api/shifts/{id}/close

**Auth:** STAFF (own open shift) or ADMIN.

Staff physically counts cash and reads the card terminal, then submits:

```json
{
  "confirmedCashAmount": "273.00",
  "confirmedMbAmount": "80.00",
  "note": "Everything matched tonight"
}
```

`note` is optional.

**200** — response includes all preview fields plus:

| Additional field | Description |
|---|---|
| `confirmedCashAmount` | Physically counted |
| `confirmedMbAmount` | Read from card terminal |
| `cashDifference` | `confirmedCashAmount − expectedPhysicalCash` |
| `mbDifference` | `confirmedMbAmount − totalMb` |
| `closedById` | UUID of the user who closed the shift |
| `status` | `CLOSED_OK` if both diffs = 0, otherwise `CLOSED_WITH_INCIDENT` |

**Displaying differences:**
- `cashDifference > 0` → "Cash over by X EUR"
- `cashDifference < 0` → "Cash short by X EUR"
- `cashDifference = 0` → "Cash matched"
- Same logic for `mbDifference`
- `status = CLOSED_WITH_INCIDENT` → show warning banner

| Status | Meaning |
|---|---|
| 400 `You are not allowed to access this shift` | — |
| 400 `Shift is already closed` | — |
| 404 `Shift not found` | — |

---

## 5. Sales and Discounts

### POST /api/sales · STAFF token only · 201

The server calculates all totals. Mobile must not compute final totals.

```json
{
  "items": [
    { "productName": "Coffee", "quantity": 2, "unitPrice": 10.00 }
  ],
  "discounts": [],
  "payments": [
    { "method": "CASH", "amount": 20.00 }
  ],
  "invoiceStatus": "PENDING",
  "note": "Optional"
}
```

---

### Payment methods

| Value | Affects physical cash? |
|---|---|
| `CASH` | Yes |
| `MB` (card terminal) | No |
| `GLOVO_ONLINE` | No |
| `GLOVO_CASH` | Yes |

Split payments are supported (multiple entries in `payments`). Same method cannot appear twice. **`sum(payments[].amount)` must equal `finalTotalAmount`.**

---

### Invoice status

`PENDING` → `INVOICED` via `PATCH /api/sales/{id}/invoice`. Cannot revert.

---

### Discounts

All calculations are server-side.

**LOYALTY_CARD** — fixed 20 EUR deduction, requires subtotal >= 25 EUR.
```json
{ "reason": "LOYALTY_CARD" }
```

**VOUCHER_10_PERCENT** — 10% over subtotal.
```json
{ "reason": "VOUCHER_10_PERCENT" }
```

**MANUAL_DISCOUNT** — fixed amount, manager-approved.
```json
{ "reason": "MANUAL_DISCOUNT", "amount": 5.00, "note": "Manager approved discount" }
```
Rules: `amount` required, > 0, < subtotal (final total must remain > 0). `note` required. Server stores as `type = FIXED_AMOUNT`.

---

### Full example — discount + split payment

```json
{
  "items": [
    { "productName": "Coffee",    "quantity": 2, "unitPrice": 10.00 },
    { "productName": "Croissant", "quantity": 1, "unitPrice": 10.00 }
  ],
  "discounts": [{ "reason": "MANUAL_DISCOUNT", "amount": 5.00, "note": "Manager approved" }],
  "payments": [
    { "method": "CASH", "amount": 15.00 },
    { "method": "MB",   "amount": 10.00 }
  ],
  "invoiceStatus": "PENDING"
}
```

subtotal 30.00 − discount 5.00 = finalTotal 25.00 = 15.00 + 10.00 ✓

---

### Sale creation errors

| Status | Message | Meaning |
|---|---|---|
| 400 | `Staff has no open shift` | No open shift |
| 400 | `Payment total must match sale final total` | Payments ≠ server finalTotal |
| 400 | `Sale final total must be greater than zero` | Discounts wiped the total |
| 400 | `Manual discount amount must be greater than zero` | — |
| 400 | `Manual discount requires a note` | — |
| 400 | `Loyalty card discount requires subtotal of at least 25.00` | — |

---

## 6. ADMIN Flow

Login via `POST /api/auth/admin/login`. `user.role = "ADMIN"`, `user.storeId = null`.

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/stores` | any authenticated | `?search=`, `?includeInactive=true` |
| `GET /api/admin/users` | ADMIN | `?role=STAFF`, `?includeInactive=true` |
| `POST /api/admin/users/staff` | ADMIN | body: `fullName`, `username`, `pin`, `storeId` |
| `GET /api/admin/reports/daily` | ADMIN | `?storeId=<UUID>&date=2026-05-15` |
| `GET /api/admin/reports/weekly` | ADMIN | `?storeId=<UUID>&weekStart=2026-05-11` |
| `GET /api/admin/reports/monthly` | ADMIN | `?storeId=<UUID>&month=2026-05` |
| `GET /api/admin/weekly-reviews` | ADMIN | optional filters — see below |
| `POST /api/admin/weekly-reviews` | ADMIN | body: `storeId`, `staffId`, `weekStartDate`, `weekEndDate`, `status`, `note` |
| `GET /api/shifts` | ADMIN | optional filters — see below |
| `GET /api/sales?shiftId=<UUID>` | ADMIN | no ownership restriction |

`status` for weekly review: `REVIEWED_OK` | `REVIEWED_WITH_INCIDENT`.

#### GET /api/admin/weekly-reviews — optional query params

| Param | Type | Description |
|---|---|---|
| `storeId` | UUID | Filter to one store |
| `staffId` | UUID | Filter to one staff member |
| `weekStart` | ISO date (`YYYY-MM-DD`) | Exact match on week start date |
| `status` | `REVIEWED_OK` \| `REVIEWED_WITH_INCIDENT` | Filter by review status |

#### GET /api/shifts — optional query params (ADMIN)

| Param | Type | Description |
|---|---|---|
| `storeId` | UUID | Filter to one store |
| `staffId` | UUID | Filter to one staff member |
| `status` | `OPEN` \| `CLOSED` | Filter by shift status |
| `from` | ISO date (`YYYY-MM-DD`) | Inclusive start of date range (by `openedAt`) |
| `to` | ISO date (`YYYY-MM-DD`) | Inclusive end of date range (by `openedAt`) |

All params are optional. STAFF callers are always scoped to their own shifts regardless of `staffId` param.

---

## 7. Error Handling Contract

```json
{ "success": false, "message": "...", "data": null }
```

| Status | Meaning | Mobile action |
|---|---|---|
| 400 | Validation or business rule violation | Show message to user |
| 401 | Token missing, expired, or invalid | Clear SecureStore, redirect to login |
| 403 | Valid token, insufficient role | Show access denied, do not clear token |
| 404 | Resource not found | Show not found (see exception below) |
| 500 | Unexpected server error | Show generic error screen, log context |

**Exception — treat as normal state, not error:**

| Endpoint | Status | Message | Mobile action |
|---|---|---|---|
| `GET /api/shifts/current` | 404 | `Open shift not found` | Navigate to Open Shift screen |

---

## 8. Known Deferred Items

| Feature | Notes |
|---|---|
| `GET /api/shifts/current` returning 200 + null | Currently 404 when no shift is open. May change to `200 { data: null }` to simplify mobile. |
| Mobile home composite endpoint | No single endpoint combines shift + sales + totals. Mobile makes multiple calls. |
| Pagination | List endpoints return all results. Pagination planned before lists grow large. |
| Refresh tokens | Tokens expire, requiring re-login. Refresh flow planned for auth hardening phase. |
| Logout / token invalidation | No `POST /api/auth/logout`. Logout = delete token from SecureStore. |
| Trusted devices | Not implemented. |
| Store timezone | All timestamps are UTC. Mobile must convert for local display. |
