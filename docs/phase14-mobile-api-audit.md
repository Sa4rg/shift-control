# Phase 14 — Mobile API Contract Audit

## Executive Summary

The backend is **mostly mobile-ready** for the STAFF core flow. Auth, shift opening, sale creation, invoicing, cancellation, incident creation, and shift closing all have working endpoints with structured responses.

There are **5 critical gaps** that block or significantly degrade the mobile MVP experience:

1. `AuthenticatedUserResponse` has no `fullName` — mobile cannot display staff name after login or session restore.
2. There is no shift-close preview endpoint — mobile cannot show expected totals before the staff enters confirmed cash/MB amounts.
3. `GET /api/sales` only accepts `?shiftId=current` — mobile cannot list sales for a past shift, and admins have no way to query sales by shiftId.
4. `MANUAL_DISCOUNT` is in the `DiscountReason` enum but the service throws `BusinessException("Unsupported discount reason")` — this discount type is broken and must be removed from the enum or implemented before exposing to mobile.
5. `MissingServletRequestParameterException` returns HTTP 500 instead of 400 — admin report endpoints return a server error when a required query param is missing.

---

## STAFF Mobile Flow

### 1. App Start / Session Restore

| Attribute | Value |
|---|---|
| Screen | Splash / auto-login |
| Endpoint | `GET /api/auth/me` |
| Auth | Bearer token |
| Role | Any |
| Request | None |
| Response fields needed | `id`, `username`, **`fullName`** _(missing)_, `role`, `storeId` |
| Current status | ⚠️ Partial |
| Notes | `fullName` is absent from `AuthenticatedUserResponse`. Mobile must display the staff member's name on the home screen. Adding `fullName` to this response is **MUST HAVE**. Mobile should call this endpoint on startup to validate the stored token and restore the session. On 401, mobile must clear the stored token and redirect to login. |

---

### 2. Staff Login

| Attribute | Value |
|---|---|
| Screen | Login |
| Endpoint | `POST /api/auth/staff/login` |
| Auth | None |
| Request | `{ "username": "string", "pin": "123456" }` |
| Response fields needed | `accessToken`, `tokenType`, `expiresIn`, `user.id`, `user.role`, `user.storeId`, **`user.fullName`** _(missing)_ |
| Current status | ⚠️ Partial |
| Notes | Token type is always `"Bearer"`. `expiresIn` is in seconds — mobile should store `loginTime + expiresIn * 1000` as the local expiry timestamp and proactively refresh or re-login when it expires. Inactive users return `400 Invalid credentials` (same message as wrong PIN — by design). |

---

### 3. Open Shift

| Attribute | Value |
|---|---|
| Screen | Home / Start Shift |
| Endpoint | `POST /api/shifts/open` |
| Auth | Bearer — STAFF |
| Request | `{ "type": "DAY" \| "NIGHT" }` |
| Response fields needed | `id`, `type`, `status`, `openedAt`, `storeId`, `storeName`, `staffName` |
| Current status | ✅ Ready |
| Notes | `ShiftResponse` includes all required fields. If STAFF already has an open shift, returns `400 Staff already has an open shift`. Mobile must check this error code and redirect to the current shift instead of showing a generic error. |

---

### 4. Get Current Shift

| Attribute | Value |
|---|---|
| Screen | Home / Active Shift |
| Endpoint | `GET /api/shifts/current` |
| Auth | Bearer — STAFF |
| Request | None |
| Response fields needed | `id`, `type`, `status`, `openedAt`, `staffName`, `storeId`, `storeName` |
| Current status | ⚠️ Partial |
| Notes | Returns `404 Open shift not found` when no shift is open. Mobile **must not** treat this 404 as an error — it is the normal state before opening a shift and should render the "no active shift" screen. `ShiftResponse` has no `salesCount` or `totalSales` — mobile home screen will need a second call to `GET /api/sales?shiftId=current` to populate the sales count badge. |

---

### 5. Create Sale

| Attribute | Value |
|---|---|
| Screen | New Sale |
| Endpoint | `POST /api/sales` |
| Auth | Bearer — STAFF |
| Request | `{ "items": [...], "discounts": [...], "payments": [...], "invoiceStatus": "PENDING"\|"INVOICED", "note": "..." }` |
| Response fields needed | `id`, `finalTotalAmount`, `status`, `invoiceStatus`, `items`, `payments`, `discounts` |
| Current status | ⚠️ Partial |
| Notes | No `shiftId` in the request body — the server automatically uses the staff's open shift. If no open shift exists, returns `400 Staff has no open shift`. Items require `productName` (string, max 160), `quantity` (int > 0), `unitPrice` (decimal > 0). Payments require `method` (`CASH`, `MB`, `GLOVO_ONLINE`, `GLOVO_CASH`) and `amount`. Payment total **must exactly equal** the computed `finalTotalAmount` — mobile must pre-calculate and match before submitting. |

---

### 6. Discounts

| Attribute | Value |
|---|---|
| Supported types | `LOYALTY_CARD` (fixed €20.00, requires subtotal ≥ €25.00), `VOUCHER_10_PERCENT` (10% of subtotal) |
| Broken type | `MANUAL_DISCOUNT` — present in the `DiscountReason` enum but throws `400 Unsupported discount reason` |
| Notes | Mobile must only expose `LOYALTY_CARD` and `VOUCHER_10_PERCENT` in the discount picker. The discount amount is **computed by the server** from the reason — mobile does not send an amount. Mobile must account for the computed discount when pre-calculating `finalTotalAmount` to match payment totals. |

---

### 7. List Current Shift Sales

| Attribute | Value |
|---|---|
| Screen | Sale List |
| Endpoint | `GET /api/sales?shiftId=current` |
| Auth | Bearer — STAFF |
| Request | `?shiftId=current` (literal string, only accepted value) |
| Response fields needed | `id`, `finalTotalAmount`, `invoiceStatus`, `status`, `createdAt`, `payments`, `items` |
| Current status | ⚠️ Partial |
| Notes | Returns all sales (ACTIVE + CANCELLED) for the current open shift ordered by `createdAt DESC`. If no open shift, returns `400 Staff has no open shift`. ADMIN users cannot use this endpoint — it throws `400 Only staff users can query current shift sales`. Any `shiftId` value other than `"current"` throws `400 Only shiftId=current is supported for now`. |

---

### 8. Cancel Sale

| Attribute | Value |
|---|---|
| Screen | Sale Detail — Cancel |
| Endpoint | `PATCH /api/sales/{id}/cancel` |
| Auth | Bearer — STAFF (own shift only) or ADMIN |
| Request | `{ "reason": "string (max 500)" }` |
| Response fields needed | `id`, `status`, `cancelledReason`, `cancelledAt`, `cancelledByName` |
| Current status | ✅ Ready |
| Notes | Cannot cancel a sale from a closed shift (400). Cannot cancel an already-cancelled sale (400). Sale is **never deleted**, only marked `CANCELLED`. |

---

### 9. Mark Sale as Invoiced

| Attribute | Value |
|---|---|
| Screen | Sale Detail — Invoice toggle |
| Endpoint | `PATCH /api/sales/{id}/invoice` |
| Auth | Bearer — STAFF (own shift) or ADMIN |
| Request | None (no body) |
| Response fields needed | `id`, `invoiceStatus` |
| Current status | ✅ Ready |
| Notes | Cannot invoice a cancelled sale (400). Cannot invoice an already-invoiced sale (400). |

---

### 10. Close Shift — Preview (MISSING)

| Attribute | Value |
|---|---|
| Screen | Pre-close Summary |
| Endpoint | **Does not exist** |
| Current status | ❌ Missing |
| Notes | Before the staff enters confirmed cash and MB amounts, mobile should display: `totalCash`, `totalMb`, `totalGlovoOnline`, `totalGlovoCash`, `totalSales`, `expectedPhysicalCash`, `cashToWithdraw`, `pendingInvoiceTotal`. None of these values are available until the shift is actually closed. This is the largest UX gap for the mobile STAFF flow. **MUST HAVE**: `GET /api/shifts/{id}/close-preview` that returns computed totals without persisting the closure. |

---

### 11. Close Shift

| Attribute | Value |
|---|---|
| Screen | Close Shift — confirm amounts |
| Endpoint | `POST /api/shifts/{id}/close` |
| Auth | Bearer — any authenticated user |
| Request | `{ "confirmedCashAmount": decimal, "confirmedMbAmount": decimal, "note": "string" }` |
| Response fields needed | All `ShiftClosureResponse` fields |
| Current status | ✅ Ready |
| Notes | Returns `ShiftClosureResponse` with all computed totals, differences, and status. `ClosureStatus` is either `CLOSED_OK` or `CLOSED_WITH_INCIDENT`. Mobile should use `cashDifference` and `mbDifference` to decide whether to prompt for an incident. Cannot close an already-closed shift (400). |

---

### 12. Create Incident

| Attribute | Value |
|---|---|
| Screen | Incident Report |
| Endpoint | `POST /api/incidents` |
| Auth | Bearer — STAFF or ADMIN |
| Request | `{ "shiftId": uuid?, "closureId": uuid?, "saleId": uuid?, "type": IncidentType, "severity": IncidentSeverity, "title": string, "description": string }` |
| Response fields needed | `id`, `type`, `status`, `severity`, `title`, `createdAt` |
| Current status | ⚠️ Partial |
| Notes | All context IDs (`shiftId`, `closureId`, `saleId`) are optional at the validation layer — none is `@NotNull`. There is no service-level check that at least one context ID is provided. Mobile should always send at least `shiftId`. The most common mobile use case after closing with a difference is: `{ shiftId, closureId, type: "CASH_DIFFERENCE", severity: "MEDIUM", title: "...", description: "..." }`. |

---

### 13. List Own Incidents

| Attribute | Value |
|---|---|
| Screen | Incidents list |
| Endpoint | `GET /api/incidents` |
| Auth | Bearer — STAFF (own incidents only) |
| Request | `?status=OPEN\|RESOLVED` (optional) |
| Response fields needed | `id`, `type`, `status`, `severity`, `title`, `createdAt` |
| Current status | ✅ Ready |
| Notes | STAFF can only see their own incidents — the service filters by `reportedById`. |

---

## ADMIN Mobile Flow

### 1. Admin Login

| Attribute | Value |
|---|---|
| Endpoint | `POST /api/auth/admin/login` |
| Request | `{ "username": "string", "password": "string" }` |
| Response | Same `AuthResponse` structure as staff login |
| Current status | ⚠️ Partial |
| Notes | `AuthenticatedUserResponse` has no `fullName`. For ADMIN, `storeId` is always `null` in the response — admin is global. |

---

### 2. List Stores

| Attribute | Value |
|---|---|
| Endpoint | `GET /api/stores` |
| Auth | Bearer — any authenticated user (read is open) |
| Request | `?search=string&includeInactive=false` (both optional) |
| Current status | ✅ Ready |
| Notes | Admin mobile needs this to discover `storeId` before calling any report endpoint. By default returns only active stores. |

---

### 3. Daily Report

| Attribute | Value |
|---|---|
| Endpoint | `GET /api/admin/reports/daily?storeId=<UUID>&date=2026-05-14` |
| Auth | Bearer — ADMIN only |
| Request | `storeId` (required), `date` ISO format (required) |
| Response | Store totals + per-staff summaries |
| Current status | ⚠️ Partial |
| Notes | Missing `storeId` or `date` returns **500 Unexpected internal error** instead of 400 (known bug — `MissingServletRequestParameterException` not handled in `GlobalExceptionHandler`). Mobile must send both params always. |

---

### 4. Weekly Report

| Attribute | Value |
|---|---|
| Endpoint | `GET /api/admin/reports/weekly?storeId=<UUID>&weekStart=2026-05-12` |
| Auth | Bearer — ADMIN only |
| Request | `storeId` (required), `weekStart` ISO date (Monday of the week) |
| Response | `WeeklyReportResponse` with `staffSummaries` list |
| Current status | ⚠️ Partial |
| Notes | Same 500 bug when params are missing. `weekStart` must be the Monday — the service computes `weekEnd` as `weekStart + 6 days`. |

---

### 5. Monthly Report

| Attribute | Value |
|---|---|
| Endpoint | `GET /api/admin/reports/monthly?storeId=<UUID>&month=2026-05` |
| Auth | Bearer — ADMIN only |
| Request | `storeId` (required), `month` as `YYYY-MM` string |
| Response | `MonthlyReportResponse` |
| Current status | ⚠️ Partial |
| Notes | Same 500 bug for missing params. |

---

### 6. Weekly Admin Reviews

| Attribute | Value |
|---|---|
| Endpoints | `POST /api/admin/weekly-reviews`, `GET /api/admin/weekly-reviews`, `GET /api/admin/weekly-reviews/{id}` |
| Auth | Bearer — ADMIN only |
| Create request | `{ "storeId": uuid, "staffId": uuid, "weekStart": date, "status": "PENDING"\|"REVIEWED"\|"FLAGGED", "note": "string" }` |
| Current status | ✅ Ready |
| Notes | Reviews are separate from the computed weekly report — this is the admin's formal annotation. Mobile create flow: view the weekly report → create a review referencing `storeId`, `staffId`, and `weekStart`. |

---

### 7. Manage Users (Admin-only)

| Attribute | Value |
|---|---|
| Endpoints | `POST /api/admin/users/staff`, `POST /api/admin/users/admin`, `GET /api/admin/users`, `GET /api/admin/users/{id}`, `PATCH /api/admin/users/{id}/deactivate` |
| Auth | Bearer — ADMIN only |
| Current status | ✅ Ready |
| Notes | For mobile MVP, admin may need to create staff on the go. `GET /api/admin/users?role=STAFF` for staff-only list. |

---

## API Contract Details

### Auth

#### `POST /api/auth/staff/login`
- **Auth**: None
- **Request**: `{ username: string, pin: "000000" }`
- **Success 200**: `ApiResponse<AuthResponse>` — `{ success: true, message: "Login successful", data: { accessToken, tokenType: "Bearer", expiresIn: long, user: { id, username, role: "STAFF", storeId } } }`
- **Error cases**:
  - `400` — `Invalid credentials` (wrong user, wrong PIN, inactive user, ADMIN trying staff login)
  - `400` — `Validation failed` (blank username, PIN not 6 digits)

#### `POST /api/auth/admin/login`
- **Auth**: None
- **Request**: `{ username: string, password: string }`
- **Success 200**: Same `AuthResponse` shape with `role: "ADMIN"`, `storeId: null`
- **Error cases**: Same 400 pattern

#### `GET /api/auth/me`
- **Auth**: Bearer
- **Success 200**: `ApiResponse<AuthenticatedUserResponse>` — `{ id, username, role, storeId }`
- **Error cases**: `401 Unauthorized` (no/invalid/expired token)

---

### Shifts

#### `POST /api/shifts/open`
- **Auth**: Bearer — STAFF
- **Request**: `{ type: "DAY" | "NIGHT" }`
- **Success 201**: `ApiResponse<ShiftResponse>`
- **Error cases**: `400` — already has open shift / not STAFF / inactive user / no store / inactive store

#### `GET /api/shifts/current`
- **Auth**: Bearer — STAFF
- **Success 200**: `ApiResponse<ShiftResponse>`
- **Error cases**: `404 Open shift not found` (no open shift — normal state)

#### `POST /api/shifts/{id}/close`
- **Auth**: Bearer — any authenticated
- **Request**: `{ confirmedCashAmount: decimal, confirmedMbAmount: decimal, note?: string }`
- **Success 200**: `ApiResponse<ShiftClosureResponse>`
- **Error cases**: `400` — already closed / shift not found

**`ShiftResponse` fields**: `id`, `staffId`, `staffName`, `storeId`, `storeName`, `type` (DAY/NIGHT), `status` (OPEN/CLOSED), `openedAt` (Instant), `closedAt` (Instant|null), `closedById` (UUID|null)

**`ShiftClosureResponse` fields**: `id`, `shiftId`, `closedById`, `totalCash`, `totalMb`, `totalGlovoOnline`, `totalGlovoCash`, `totalSales`, `pendingInvoiceTotal`, `cashToWithdraw`, `expectedPhysicalCash`, `confirmedCashAmount`, `confirmedMbAmount`, `cashDifference`, `mbDifference`, `status` (CLOSED_OK/CLOSED_WITH_INCIDENT), `note`, `createdAt`, `updatedAt`

---

### Sales

#### `POST /api/sales`
- **Auth**: Bearer — STAFF
- **Request**:
  ```json
  {
    "items": [{ "productName": "string", "quantity": 1, "unitPrice": "12.50" }],
    "discounts": [{ "reason": "LOYALTY_CARD", "note": "optional" }],
    "payments": [{ "method": "CASH", "amount": "12.50" }],
    "invoiceStatus": "PENDING",
    "note": "optional"
  }
  ```
- **Success 201**: `ApiResponse<SaleResponse>`
- **Error cases**:
  - `400 Staff has no open shift`
  - `400 Payment total must match sale final total`
  - `400 Sale final total must be greater than zero`
  - `400 Loyalty card discount requires subtotal of at least 25.00`
  - `400 Unsupported discount reason` (if `MANUAL_DISCOUNT` sent — treat as broken)

#### `GET /api/sales?shiftId=current`
- **Auth**: Bearer — STAFF only
- **Success 200**: `ApiResponse<List<SaleResponse>>`
- **Error cases**: `400 Staff has no open shift`, `400 Only shiftId=current is supported for now`

#### `PATCH /api/sales/{id}/cancel`
- **Auth**: Bearer — STAFF (own) or ADMIN
- **Request**: `{ "reason": "string" }`
- **Success 200**: `ApiResponse<SaleResponse>`
- **Error cases**: `400` — already cancelled / shift closed

#### `PATCH /api/sales/{id}/invoice`
- **Auth**: Bearer — STAFF (own) or ADMIN
- **Request**: None
- **Success 200**: `ApiResponse<SaleResponse>`
- **Error cases**: `400` — cancelled / already invoiced

**`SaleResponse` key fields**: `id`, `shiftId`, `status` (ACTIVE/CANCELLED), `invoiceStatus` (PENDING/INVOICED), `subtotalAmount`, `discountTotalAmount`, `finalTotalAmount`, `cancelledReason`, `cancelledAt`, `cancelledByName`, `items[]`, `discounts[]`, `payments[]`, `createdAt`

---

### Incidents

#### `POST /api/incidents`
- **Auth**: Bearer — STAFF or ADMIN
- **Request**:
  ```json
  {
    "shiftId": "uuid (optional)",
    "closureId": "uuid (optional)",
    "saleId": "uuid (optional)",
    "type": "CASH_DIFFERENCE | MB_DIFFERENCE | GLOVO_ISSUE | WRONG_CHARGE | PENDING_INVOICE | SALE_CANCELLATION | OPERATIONAL_NOTE | OTHER",
    "severity": "LOW | MEDIUM | HIGH",
    "title": "string (max 160)",
    "description": "string (max 1000)"
  }
  ```
- **Success 201**: `ApiResponse<IncidentResponse>`

#### `GET /api/incidents?status=OPEN`
- **Auth**: Bearer — STAFF (own only) or ADMIN (all)
- **Success 200**: `ApiResponse<List<IncidentResponse>>`

---

## Error Handling Contract

Mobile must handle the following HTTP status codes consistently.

### 400 — Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "pin": "PIN must contain exactly 6 digits",
    "items": "must not be empty"
  }
}
```
`data` is a map of field paths to error messages. Mobile should display the relevant field error inline.

### 400 — Business Rule Error
```json
{
  "success": false,
  "message": "Staff already has an open shift",
  "data": null
}
```
`data` is always `null`. The `message` field contains a human-readable description. **Do not rely on the message text for programmatic logic** — message strings are not versioned. Use HTTP status + context instead.

### 401 — Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "data": null
}
```
Token is missing, expired, or invalid. Mobile must clear the stored token and redirect to the login screen.

### 403 — Forbidden
```json
{
  "success": false,
  "message": "Forbidden",
  "data": null
}
```
Token is valid but the role does not have permission for this endpoint (e.g., STAFF calling `/api/admin/**`).

### 404 — Not Found
```json
{
  "success": false,
  "message": "Open shift not found",
  "data": null
}
```
Resource does not exist or is not accessible to the caller. For `GET /api/shifts/current`, a 404 is **not an error** — it is the expected state before opening a shift.

### 500 — Internal Server Error
```json
{
  "success": false,
  "message": "Unexpected internal error",
  "data": null
}
```
Unhandled exception. Currently triggered (incorrectly) by missing required `@RequestParam` on report endpoints. Mobile should display a generic error message and log the occurrence.

---

## Missing or Awkward Mobile Contracts

### MUST HAVE

#### Gap 1: `fullName` missing from `AuthenticatedUserResponse`
- **Why mobile needs it**: Mobile home screen and sale history display the staff member's name. Currently `GET /api/auth/me` and both login responses omit `fullName`.
- **Recommended change**: Add `fullName` field to `AuthenticatedUserResponse`:
  ```java
  public record AuthenticatedUserResponse(UUID id, String username, String fullName, Role role, UUID storeId) {}
  ```
- **Tests needed**: Update `AuthIntegrationTest` to assert `$.data.user.fullName` on login and `$.data.fullName` on `/me`.

---

#### Gap 2: No shift-close preview endpoint
- **Why mobile needs it**: Mobile must show the staff member their computed totals (`totalCash`, `expectedPhysicalCash`, `cashToWithdraw`, `totalSales`) **before** asking them to enter confirmed cash and MB amounts. Without this, the close flow is blind — staff types amounts with no reference.
- **Recommended endpoint**: `GET /api/shifts/{id}/close-preview`
  - Auth: Bearer — STAFF (own shift) or ADMIN
  - Response: A new `ClosePreviewResponse` record with all computed totals but no `confirmedCashAmount`, `confirmedMbAmount`, or differences.
  - The service reuses the same calculation logic as `closeShift` but does **not** persist anything.
- **Tests needed**: Unit test the calculation, integration test the HTTP response, test 404 when shift not found, test 400 when shift already closed.

---

#### Gap 3: `MANUAL_DISCOUNT` enum value is broken
- **Why mobile needs it**: The `DiscountReason` enum has `MANUAL_DISCOUNT` but the service throws `400 Unsupported discount reason` when it is sent. Mobile UI cannot safely expose this option.
- **Recommended change**: Either implement `MANUAL_DISCOUNT` (requires adding `amount` field to `CreateSaleDiscountRequest`) or **remove it from the enum** until it is implemented. Leaving a broken enum value creates confusion and runtime errors.
- **Tests needed**: Test that `MANUAL_DISCOUNT` returns a clear error until implemented; or test the full `MANUAL_DISCOUNT` flow if implemented.

---

#### Gap 4: `MissingServletRequestParameterException` returns 500 instead of 400
- **Why mobile needs it**: Admin report endpoints require `storeId`, `date`, `weekStart`, or `month`. A missing param currently returns 500 (`Unexpected internal error`). Mobile cannot distinguish this from a real server crash.
- **Recommended change**: Add to `GlobalExceptionHandler`:
  ```java
  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<ApiResponse<Void>> handleMissingParam(MissingServletRequestParameterException ex) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST)
              .body(ApiResponse.error("Missing required parameter: " + ex.getParameterName(), null));
  }
  ```
- **Tests needed**: Update `WeeklyReportIntegrationTest` test 4 to assert 400 once this is fixed.

---

#### Gap 5: `GET /api/sales` cannot list sales for a given shiftId
- **Why mobile needs it**: Admin mobile needs to view sales for any given shift. STAFF mobile needs to view sales for a past (closed) shift's history screen. Currently only `?shiftId=current` works.
- **Recommended change**: Extend `GET /api/sales?shiftId=<UUID>` to accept any shift UUID for ADMIN, and for STAFF to accept their own shift UUIDs (past or current).
- **Tests needed**: Integration test listing sales by UUID shiftId as ADMIN; test that STAFF cannot access another staff member's shift sales.

---

### SHOULD HAVE

#### Gap 6: `GET /api/shifts/current` returns 404 — awkward mobile UX
- **Why mobile notices it**: A 404 is conventionally a "resource not found" error. Getting a 404 on the home screen of the app (where checking for current shift is the first call) will trigger generic error handling in most mobile clients if not carefully coded.
- **Recommended change**: Options:
  - Keep 404 but document it clearly as "expected state" (current approach works if mobile is coded carefully).
  - Or add a query param: `GET /api/shifts/current?strict=false` returning `{ data: null }` with 200 when no open shift exists.
- **Preference**: The `200 + null data` pattern is more mobile-friendly. Mobile can check `data == null` to render the "no active shift" screen without special-casing 404 logic.

---

#### Gap 7: `ShiftResponse` has no sales summary
- **Why mobile needs it**: The STAFF home screen typically shows the active shift with a sales count and running total. Currently mobile needs two requests: `GET /api/shifts/current` + `GET /api/sales?shiftId=current`. A `salesCount` and `totalSales` field in `ShiftResponse` would reduce that to one.
- **Recommended change**: Add `salesCount: int` and `totalSales: BigDecimal` to `ShiftResponse` (computed from the shift's active sales). This is a read-only addition, non-breaking.

---

#### Gap 8: No pagination on list endpoints
- **Why mobile notices it**: All list endpoints return full result sets. For MVP with one store and moderate shift volume this is acceptable. However, `GET /api/incidents` and `GET /api/admin/users` could grow.
- **Recommended change**: For Phase 14 MVP, acceptable as-is. Add `?page=&size=` support in Phase 15 before production.

---

### NICE TO HAVE

#### Gap 9: No "mobile home" composite endpoint
- **Description**: A single `GET /api/me/home` returning `{ user, currentShift, todaySalesSummary }` would reduce mobile app startup from 2–3 sequential calls to one.
- **Priority**: Low — only adds convenience. Correct but parallel calls achieve the same result.

---

#### Gap 10: Incident context validation — at least one context ID required
- **Description**: `CreateIncidentRequest` accepts `shiftId`, `closureId`, `saleId` all as optional with no service check that at least one is present. An incident with no context is technically valid but has low audit value.
- **Recommended change**: Add a service-layer check: at least one of `shiftId`, `closureId`, or `saleId` must be non-null.

---

#### Gap 11: Timestamps are raw ISO-8601 Instants — no timezone info in user context
- **Description**: All `Instant` fields serialize as UTC strings (e.g., `"2026-05-14T10:30:00Z"`). The mobile app will need to convert to the store's local timezone for display. No timezone is stored on the `Store` entity currently.
- **Recommended change**: Add a `timezone` field to `Store` (e.g., `"Europe/Lisbon"`) so mobile can format all timestamps correctly.

---

## Recommended Phase 14 Implementation Plan

Execute in this order to unblock mobile development as fast as possible.

### Step 1 — `fullName` in `AuthenticatedUserResponse`
Single-field addition. Zero risk. Unblocks login screen and session restore.

**Files**: `AuthenticatedUserResponse.java` — add `fullName`; update `fromEntity()`. Update `AuthIntegrationTest`.

---

### Step 2 — Fix `GlobalExceptionHandler` for `MissingServletRequestParameterException`
Single handler addition. Fixes admin report 500 bug. Low risk.

**Files**: `GlobalExceptionHandler.java`. Update `WeeklyReportIntegrationTest` test 4 assertion.

---

### Step 3 — `MANUAL_DISCOUNT` decision
Either:
- Remove `MANUAL_DISCOUNT` from `DiscountReason` enum and add a migration comment, OR
- Implement it by adding `amount` field to `CreateSaleDiscountRequest` and implementing `buildDiscount` for it.

**Recommended for Phase 14**: Remove it from the enum to keep the contract clean. Implement later if needed.

---

### Step 4 — Shift close preview endpoint
`GET /api/shifts/{id}/close-preview`. New read-only endpoint, no DB writes.

**Files**: New method in `ShiftService`, new `ClosePreviewResponse` DTO, route in `ShiftController`. Add integration test.

---

### Step 5 — Sales list by shiftId UUID
Extend `GET /api/sales?shiftId=<UUID>` to support actual UUIDs for ADMIN.

**Files**: `SaleController`, `SaleService` (add `listSalesByShiftId`). Add integration tests for ADMIN and STAFF authorization.

---

### Step 6 — `GET /api/shifts/current` returns 200+null vs 404 (optional)
Low priority, but improves mobile ergonomics. Can be deferred to after Steps 1–5 are complete.

---

### Step 7 — `salesCount` + `totalSales` in `ShiftResponse` (optional for Phase 14)
Reduces mobile home screen to a single API call. Can be deferred if mobile team accepts two calls.
