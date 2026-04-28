# User Stories

# Authentication

## US-AUTH-001
As a staff user,
I want to log in with my username and PIN,
so that I can quickly access the app during my shift.

## US-AUTH-002
As an admin user,
I want to log in with stronger credentials,
so that administrative operations remain secure.

## US-AUTH-003
As the system,
I want to reject invalid credentials with a generic message,
so that attackers cannot identify valid usernames.

---

# Shift Management

## US-SHIFT-001
As a staff user,
I want to open my shift,
so that I can begin registering sales.

## US-SHIFT-002
As a staff user,
I want the system to prevent multiple open shifts,
so that sales remain properly associated with a single active shift.

## US-SHIFT-003
As a staff user,
I want to close my shift,
so that the system calculates totals automatically.

---

# Sales Registration

## US-SALE-001
As a staff user,
I want to register a sale with one or more items,
so that all products sold during the shift are recorded.

## US-SALE-002
As a staff user,
I want to register split payments,
so that customers can pay using multiple payment methods.

## US-SALE-003
As a staff user,
I want to apply discounts,
so that promotions and loyalty rewards can be handled correctly.

## US-SALE-004
As a staff user,
I want to mark a sale as invoiced or pending invoice,
so that invoicing status remains trackable.

## US-SALE-005
As a staff user,
I want to edit a sale while the shift is open,
so that mistakes can be corrected before closing.

## US-SALE-006
As a staff user,
I want to cancel a sale without deleting it,
so that the system preserves audit history.

## US-SALE-007
As a staff user,
I want the system to validate payment totals,
so that split payments always match the final sale total.

---

# Shift Closing

## US-CLOSURE-001
As a staff user,
I want automatic shift closing totals,
so that I do not need to calculate totals manually.

## US-CLOSURE-002
As a staff user,
I want the system to calculate expected physical cash,
so that I can compare it with the real cash amount.

## US-CLOSURE-003
As a staff user,
I want to close my shift even when totals do not match,
so that unresolved situations can still be documented.

## US-CLOSURE-004
As a staff user,
I want to create an incident during shift closing,
so that differences or mistakes remain documented.

---

# Incidents

## US-INCIDENT-001
As a staff user,
I want to document problems or differences,
so that admins understand what happened during the shift.

## US-INCIDENT-002
As an admin,
I want to review incidents,
so that I can investigate mismatches or unresolved situations.

---

# Weekly Admin Review

## US-ADMIN-001
As an admin,
I want to view weekly totals grouped by staff member,
so that I can verify expected money totals.

## US-ADMIN-002
As an admin,
I want to compare expected cash against physical cash,
so that I can detect inconsistencies.

## US-ADMIN-003
As an admin,
I want to review MB totals separately,
so that I can compare them with the card terminal closing amount.

## US-ADMIN-004
As an admin,
I want to review Glovo totals separately,
so that I can compare them with external platform totals.

## US-ADMIN-005
As an admin,
I want to create admin notes or incidents,
so that weekly reconciliation issues remain documented.

---

# Auditability

## US-AUDIT-001
As an admin,
I want cancelled sales to remain visible,
so that financial history is preserved.

## US-AUDIT-002
As an admin,
I want to know who edited or cancelled a sale,
so that responsibility remains traceable.

## US-AUDIT-003
As an admin,
I want historical closures to remain immutable,
so that financial data cannot be silently altered.

---

# Mobile Experience

## US-MOBILE-001
As a staff user,
I want the app to be fast and mobile-friendly,
so that I can use it efficiently during my shift.

## US-MOBILE-002
As a staff user,
I want the interface to reduce manual calculations,
so that I make fewer mistakes during closing.