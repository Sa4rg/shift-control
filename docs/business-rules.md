# Business Rules

## Stores

### BR-STORE-001
The MVP starts with a single store.

### BR-STORE-002
A staff member belongs to exactly one store.

### BR-STORE-003
An admin can view all stores.

### BR-STORE-004
Store names must be unique.

### BR-STORE-005
Store names and addresses must be trimmed before saving.

### BR-STORE-006
Stores must not be physically deleted.

### BR-STORE-007
Stores are deactivated by setting active to false.

### BR-STORE-008
Store listing returns only active stores by default.

### BR-STORE-009
Inactive stores can be included explicitly using includeInactive=true.

### BR-STORE-010
Stores can be searched by name or address.

---

# Users and Roles

### BR-USER-001
Supported roles are:
- STAFF
- ADMIN

### BR-USER-002
A STAFF user authenticates using:
- username
- PIN

### BR-USER-003
An ADMIN user authenticates using:
- username
- password

### BR-USER-004
PINs and passwords must always be hashed.

### BR-USER-005
The system must never reveal whether a username exists during authentication.

### BR-USER-006
Inactive users cannot authenticate.

### BR-USER-007
STAFF users must be created by an ADMIN user.

### BR-USER-008
STAFF users must belong to an active store.

### BR-USER-009
ADMIN users are global and must not belong to a store.

### BR-USER-010
STAFF PINs must contain exactly 6 digits.

### BR-USER-011
ADMIN passwords must contain at least 8 characters.

### BR-USER-012
User listing returns only active users by default.

### BR-USER-013
Inactive users can be included explicitly using includeInactive=true.

### BR-USER-014
Users must not be physically deleted.

### BR-USER-015
Users are deactivated by setting active to false.

### BR-USER-016
PIN hashes and password hashes must never be exposed in API responses.

---

# Auth

### BR-AUTH-001
STAFF users authenticate with username and PIN.

### BR-AUTH-002
ADMIN users authenticate with username and password.

### BR-AUTH-003
Invalid login attempts must always return "Invalid credentials" without revealing whether the username, role, status, or credential was wrong.

### BR-AUTH-004
Authenticated requests use Bearer JWT access tokens.

### BR-AUTH-005
Admin endpoints require ADMIN role.

### BR-AUTH-006
General API endpoints require an authenticated STAFF or ADMIN user.

### BR-AUTH-007
Inactive users cannot authenticate.

### BR-AUTH-008
Refresh tokens, email verification, and trusted devices are planned for a later auth hardening phase.

---

# Shifts

### BR-SHIFT-001
A staff member cannot have more than one open shift at the same time.

### BR-SHIFT-002
A shift must belong to one staff member.

### BR-SHIFT-003
A shift must belong to one store.

### BR-SHIFT-004
A shift can only be closed once.

### BR-SHIFT-005
A closed shift cannot be reopened.

### BR-SHIFT-006
Sales can only be created while a shift is open.

---

# Sales

### BR-SALE-001
A sale represents a completed paid transaction.

### BR-SALE-002
A sale must contain at least one sale item.

### BR-SALE-003
A sale can contain multiple sale items.

### BR-SALE-004
A sale can contain multiple payment methods.

### BR-SALE-005
The sum of all payment amounts must exactly match the final sale total.

### BR-SALE-006
A sale can be edited while the shift is open.

### BR-SALE-007
A sale cannot be edited after the shift is closed.

### BR-SALE-008
Deleting a sale must mark it as CANCELLED instead of physically deleting it.

### BR-SALE-009
Cancelled sales must remain auditable.

### BR-SALE-010
A cancelled sale must not affect closing totals.

### BR-SALE-011
A sale must have an invoice status.

### BR-SALE-012
Supported invoice statuses:
- PENDING
- INVOICED

### BR-SALE-013
A sale can move from PENDING to INVOICED while the shift is open.

### BR-SALE-014
A sale cannot move back from INVOICED to PENDING.

### BR-SALE-015
Products are manually typed during sale registration in the MVP.

### BR-SALE-016
The system does not manage inventory in the MVP.

### BR-SALE-017
The system does not manage customers in the MVP.

### BR-SALE-001
Only active STAFF users with an open shift can create sales.

### BR-SALE-002
Sales must contain at least one item and at least one payment.

### BR-SALE-003
Sale subtotal is calculated by the backend as the sum of item quantity multiplied by unit price.

### BR-SALE-004
Sale final total must be greater than 0.

### BR-SALE-005
Payment total must exactly match sale final total.

### BR-SALE-006
LOYALTY_CARD discount applies a fixed 20.00 EUR discount.

### BR-SALE-007
LOYALTY_CARD discount can only be applied when sale subtotal is at least 25.00 EUR.

### BR-SALE-008
VOUCHER_10_PERCENT discount applies 10% over the sale subtotal.

### BR-SALE-009
Sales are not physically deleted. They are cancelled by setting status to CANCELLED.

### BR-SALE-010
Cancelling a sale requires a reason.

### BR-SALE-011
Cancelled sales cannot be marked as invoiced.

### BR-SALE-012
Already invoiced sales cannot be invoiced again.

---

# Clousures

### BR-SHIFT-CLOSURE-001
Only an open shift can be closed.

### BR-SHIFT-CLOSURE-002
A shift can only have one closure.

### BR-SHIFT-CLOSURE-003
A shift can be closed by the shift owner or by an active ADMIN user.

### BR-SHIFT-CLOSURE-004
Cancelled sales must be ignored when calculating shift closure totals.

### BR-SHIFT-CLOSURE-005
Shift closure totals are calculated using ACTIVE sales only.

### BR-SHIFT-CLOSURE-006
totalCash is calculated from CASH payments of ACTIVE sales.

### BR-SHIFT-CLOSURE-007
totalMb is calculated from MB payments of ACTIVE sales.

### BR-SHIFT-CLOSURE-008
totalGlovoOnline is calculated from GLOVO_ONLINE payments of ACTIVE sales.

### BR-SHIFT-CLOSURE-009
totalGlovoCash is calculated from GLOVO_CASH payments of ACTIVE sales.

### BR-SHIFT-CLOSURE-010
cashToWithdraw is calculated as totalCash + totalGlovoCash.

### BR-SHIFT-CLOSURE-011
expectedPhysicalCash is calculated as store.baseCashAmount + cashToWithdraw.

### BR-SHIFT-CLOSURE-012
cashDifference is calculated as confirmedCashAmount - expectedPhysicalCash.

### BR-SHIFT-CLOSURE-013
mbDifference is calculated as confirmedMbAmount - totalMb.

### BR-SHIFT-CLOSURE-014
If cashDifference and mbDifference are both zero, the closure status is CLOSED_OK.

### BR-SHIFT-CLOSURE-015
If cashDifference or mbDifference is not zero, the closure status is CLOSED_WITH_INCIDENT.

### BR-SHIFT-CLOSURE-016
When a shift is closed, its status changes from OPEN to CLOSED and closedAt/closedBy are recorded.

----

# Discounts

### BR-DISCOUNT-001
Discounts can be:
- fixed amount
- percentage

### BR-DISCOUNT-002
Supported discount reasons:
- manual_discount
- loyalty_card
- voucher_10_percent

### BR-DISCOUNT-003
A sale total cannot be negative.

### BR-DISCOUNT-004
A sale total cannot be zero.

### BR-DISCOUNT-005
The final total after discounts must match payment totals.

### BR-SALE-LOYALTY-001
The loyalty card discount applies a fixed 20 EUR discount.

### BR-SALE-LOYALTY-002
The loyalty card discount can only be applied when the sale subtotal is greater than or equal to 25 EUR.

### BR-SALE-LOYALTY-003
A sale final total must always be greater than 0.

---

# Payments

### BR-PAYMENT-001
Supported payment methods:
- CASH
- MB
- GLOVO_ONLINE
- GLOVO_CASH

### BR-PAYMENT-002
CASH affects physical cash totals.

### BR-PAYMENT-003
GLOVO_CASH affects physical cash totals.

### BR-PAYMENT-004
MB does not affect physical cash totals.

### BR-PAYMENT-005
GLOVO_ONLINE does not affect physical cash totals.

### BR-PAYMENT-006
MB totals should match the card terminal closing amount.

### BR-PAYMENT-007
GLOVO_ONLINE totals are tracked separately from MB totals.

---

# Shift Closures

### BR-CLOSURE-001
A shift closure calculates:
- total cash
- total MB
- total Glovo online
- total Glovo cash
- total sales
- pending invoice totals

### BR-CLOSURE-002
The store cash register must remain at 103 EUR after shift closing.

### BR-CLOSURE-003
Expected physical cash is calculated from:
- CASH
- GLOVO_CASH

### BR-CLOSURE-004
The system must allow shift closing even when totals do not match.

### BR-CLOSURE-005
A closure with mismatched totals must create or require an incident.

### BR-CLOSURE-006
Shift closures must remain auditable.

---

# Incidents

### BR-INCIDENT-001
An incident represents a problem, mismatch, note, or unresolved situation.

### BR-INCIDENT-002
An incident must contain:
- type
- note
- responsible user
- timestamp

### BR-INCIDENT-003
An incident can optionally contain:
- monetary difference amount

### BR-INCIDENT-004
Incidents must remain immutable after creation.

### BR-INCIDENT-005
Incidents must remain auditable.

### BR-INCIDENT-001
Incidents are created with status OPEN.

### BR-INCIDENT-002
Incidents must be related to at least one context: shift, closure, or sale.

### BR-INCIDENT-003
STAFF users can create incidents only for their own shift, closure, or sale context.

### BR-INCIDENT-004
ADMIN users can create incidents for any valid shift, closure, or sale context.

### BR-INCIDENT-005
Only ADMIN users can list incidents globally.

### BR-INCIDENT-006
ADMIN users can view any incident.

### BR-INCIDENT-007
STAFF users can view incidents they reported or incidents related to their own shift, closure, or sale context.

### BR-INCIDENT-008
Only ADMIN users can resolve incidents.

### BR-INCIDENT-009
Only OPEN incidents can be resolved.

### BR-INCIDENT-010
Incidents can be resolved even if their related shift is already CLOSED.

### BR-INCIDENT-011
Resolved incidents cannot be resolved again.

### BR-INCIDENT-012
If multiple contexts are provided, they must belong to the same operational context.


---

# Weekly Admin Review

### BR-ADMIN-001
Admins can review weekly totals grouped by:
- store
- staff member
- payment method

### BR-ADMIN-002
Admins can compare expected totals with physical totals.

### BR-ADMIN-003
Weekly reviews can be completed with incidents when totals do not match.

### BR-ADMIN-004
Admins cannot directly edit historical shift closures.

### BR-WEEKLY-REVIEW-001
Weekly reports are calculated by store and weekStart.

### BR-WEEKLY-REVIEW-002
Weekly report weekEnd is calculated as weekStart plus 6 days.

### BR-WEEKLY-REVIEW-003
Weekly reports group shift closures by staff.

### BR-WEEKLY-REVIEW-004
Weekly reports include only closures whose shift closedAt is within the requested week range.

### BR-WEEKLY-REVIEW-005
Weekly report totals are calculated from shift closure totals.

### BR-WEEKLY-REVIEW-006
Incident count is calculated from incidents related to the staff operational context during the requested week.

### BR-WEEKLY-REVIEW-007
Only ADMIN users can access weekly admin reports.

### BR-WEEKLY-REVIEW-008
Only ADMIN users can create weekly admin reviews.

### BR-WEEKLY-REVIEW-009
A weekly admin review stores a snapshot of calculated weekly totals.

### BR-WEEKLY-REVIEW-010
The frontend does not submit weekly review totals. Totals are calculated by the backend.

### BR-WEEKLY-REVIEW-011
A weekly admin review cannot be created if the selected staff has no closure summary for that week.

### BR-WEEKLY-REVIEW-012
A weekly admin review cannot be duplicated for the same store, staff, and weekStart.

### BR-WEEKLY-REVIEW-013
Weekly admin review status can be REVIEWED_OK or REVIEWED_WITH_INCIDENT.

### BR-WEEKLY-REVIEW-014
Admins do not edit old shift closures directly. Weekly reviews preserve administrative review history.

---

# Auditability

### BR-AUDIT-001
Important actions must remain auditable.

### BR-AUDIT-002
The system must track:
- who created a sale
- who edited a sale
- who cancelled a sale
- who created an incident
- when the action occurred

### BR-AUDIT-003
Critical financial information must never be physically deleted.

### BR-AUDIT-001
Sale cancellations must record cancelledBy and cancelledAt.

### BR-AUDIT-002
Store deactivations must record deactivatedBy and deactivatedAt.

### BR-AUDIT-003
User deactivations must record deactivatedBy and deactivatedAt.

### BR-AUDIT-004
Shift closures must record closedBy and closedAt.

### BR-AUDIT-005
Incident resolution must record resolvedBy and resolvedAt.

### BR-AUDIT-006
Weekly admin reviews must record reviewedBy.

---

# Connectivity

### BR-CONNECTIVITY-001
The MVP requires internet connectivity.

### BR-CONNECTIVITY-002
Offline mode is not supported in the MVP.

---

# Money Handling

### BR-MONEY-001
All money values must use BigDecimal.

### BR-MONEY-002
The system must never use float or double for monetary calculations.

### BR-MONEY-003
Money calculations must preserve precision.