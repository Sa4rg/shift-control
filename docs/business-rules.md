# Business Rules

## Stores

### BR-STORE-001
The MVP starts with a single store.

### BR-STORE-002
A staff member belongs to exactly one store.

### BR-STORE-003
An admin can view all stores.

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

---

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