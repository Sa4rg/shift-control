# Shift Control

Internal tool for shift sales control, cash closing, incident tracking, and weekly admin review.

## What is this?

Shift Control is a mobile-first internal application built for store operations. It replaces the manual process of tracking sales on paper or phone notes with a structured digital workflow that staff and administrators can rely on every day.

This is **not** a POS, an inventory system, or a billing platform. It exists to solve a specific set of operational problems:

- Staff register paid sales during their shift, grouped by payment method (cash, card, Glovo).
- Each sale tracks whether it has been invoiced or is still pending.
- At the end of a shift, the app calculates totals automatically — no more manual arithmetic.
- When the physical cash or card terminal amount does not match what the app calculated, the difference is documented as an incident.
- Administrators can review weekly performance per staff member and store, audit incidents, and keep a historical record of every shift closure.

## Who uses it

| Role | What they do |
|------|-------------|
| **Staff** | Opens a shift · Registers sales with items, payment methods, and discounts · Closes their own shift · Documents incidents |
| **Admin** | Reviews all stores and staff · Audits shift closures · Manages weekly reviews · Creates and resolves incidents · Manages user accounts and stores |

## What the app covers

### For Staff

- Open a shift (one open shift at a time per staff member)
- Register sales with multiple items, apply discounts (loyalty card, voucher, manual), split payments across cash, card, Glovo online, or Glovo cash
- Mark sales as invoiced or keep them pending
- Edit or cancel sales while the shift is open
- Preview shift closing totals before confirming
- Close the shift — the app calculates the expected cash amount and flags any difference
- Report incidents directly from the shift or from any sale

### For Administrators

- View all stores with their active/inactive status and base cash configuration
- Manage staff and admin accounts
- Browse all shifts across the store — filter by status, staff, date range
- Review shift closures with full totals broken down by payment method
- Read and cancel sales from any shift
- Create and resolve incidents, linking them to specific shifts, closures, or sales
- Generate daily, weekly, and monthly sales reports per store
- Create and review weekly admin summaries per staff member

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend API | Java 21 · Spring Boot 4.0 |
| Database | PostgreSQL 16 |
| Schema migrations | Flyway |
| Authentication | JWT — Staff login: username + PIN · Admin login: username + password |
| Mobile app | React Native · Expo · TypeScript · Expo Router |
| Local infrastructure | Docker Compose |
| CI | Jenkins (local Docker-based pipeline) |

## Project structure

```
shift-control/
├── backend/                   # Spring Boot REST API
│   └── src/
│       ├── auth/              # JWT authentication (staff PIN + admin password)
│       ├── users/             # User management (staff and admin accounts)
│       ├── stores/            # Store management
│       ├── shifts/            # Shift lifecycle (open, current, close)
│       ├── sales/             # Sales with items, discounts, and payments
│       ├── closures/          # Shift closure totals and confirmation
│       ├── incidents/         # Incident creation and resolution
│       ├── reports/           # Daily, weekly, and monthly reports
│       ├── reviews/           # Weekly admin reviews
│       └── shared/            # Common response format, error handling, security
├── shift-control-mobile/      # Expo React Native mobile app
│   └── app/
│       ├── (auth)/            # Staff login · Admin login
│       ├── (staff)/           # All staff screens (home, sales, history, closure, incidents)
│       └── (admin)/           # All admin screens (dashboard, users, stores, shifts,
│                              #   sales, incidents, reports, weekly reviews)
├── docs/                      # Business rules, domain model, requirements, API contract
├── jenkins-local/             # Local CI setup using Docker + Jenkins
└── docker-compose.yml         # PostgreSQL local development database
```

## Getting started

### Prerequisites

- Java 21+
- Docker and Docker Compose
- Node.js 20+ and pnpm (for the mobile app)

### 1. Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL 16 instance. Flyway runs the schema migrations automatically when the backend starts.

### 2. Run the backend

```bash
cd backend
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

### 3. Run the mobile app

```bash
cd shift-control-mobile
pnpm install
pnpm start
```

### 4. Run the backend test suite

```bash
cd backend
./mvnw test
```

Tests use Testcontainers — Docker must be running.

## API overview

The backend exposes 42 REST endpoints across 11 controllers. All responses use a consistent envelope:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Authentication uses Bearer JWT. Staff and admin tokens carry their role and are validated by Spring Security on every request. Admin endpoints under `/api/admin/**` are protected at the security filter level.

## Documentation

Technical context is available in the [`docs/`](docs/) folder:

| File | Contents |
|------|---------|
| [`business-rules.md`](docs/business-rules.md) | All domain rules — shifts, sales, discounts, payments, closures, incidents, weekly reviews |
| [`domain-model.md`](docs/domain-model.md) | Entity definitions and field specifications |
| [`product-requirements.md`](docs/product-requirements.md) | MVP scope, what is out of scope, and success criteria |
| [`user-stories.md`](docs/user-stories.md) | 24 user stories across all roles |
| [`mobile-api-contract.md`](docs/mobile-api-contract.md) | Full API contract for mobile integration |
| [`admin-mobile-api-analysis.md`](docs/admin-mobile-api-analysis.md) | Detailed audit of all admin endpoints |
| [`phase-13-test-coverage-audit.md`](docs/phase-13-test-coverage-audit.md) | Test coverage analysis — 205 tests, gaps identified |
| [`phase-14-mobile-readiness-review.md`](docs/phase-14-mobile-readiness-review.md) | Backend readiness review before mobile development |
| [`jenkins-local-ci.md`](docs/jenkins-local-ci.md) | Local CI setup with Docker + Jenkins |

## Current status

The MVP is feature-complete. Both backend and mobile app are implemented and integrated.

### Backend

- [x] Authentication — JWT, staff PIN login, admin password login, session restore (`/api/auth/me`)
- [x] Stores — list, create, update, deactivate (soft-delete)
- [x] Users — list, create staff, create admin, deactivate
- [x] Shifts — open, current shift, list, detail
- [x] Sales — create with items + discounts + split payments, list, detail, invoice, cancel (soft-delete)
- [x] Discounts — Loyalty Card (€20 fixed), Voucher 10%, Manual Discount (amount + note)
- [x] Shift Closures — automatic total calculation per payment method, expected cash, confirm with physical amounts, status CLOSED\_OK or CLOSED\_WITH\_INCIDENT
- [x] Incidents — create, list, resolve (admin only), link to shift / closure / sale
- [x] Reports — daily, weekly, and monthly per store
- [x] Weekly Admin Reviews — create, list, detail; grouped by staff and store
- [x] Security — Spring Security with role-based access control; credentials hashed; generic auth error messages (OWASP compliant)
- [x] Database migrations — Flyway manages all schema changes
- [x] CI pipeline — local Jenkins with Testcontainers (205+ tests passing)

### Mobile app

- [x] Authentication flow — staff login (PIN), admin login (password), session restore on app launch
- [x] Staff screens — home dashboard, open shift, register sales, edit/cancel sales, invoice sales, shift history, shift closure (preview + confirm), incidents
- [x] Admin screens — dashboard, store management, user management, shift browser, sale detail (read-only), incident management (create + resolve), daily/weekly/monthly reports, weekly admin reviews
- [x] Shared components — AppTopBar, ErrorMessage, LoadingState, StatusBadge, EmptyState
- [x] API layer — typed API client with Bearer auth, request/response envelope handling, error normalization

### What comes next

The project is heading into its final phase before production:

- [ ] Production environment configuration (environment variables, secrets management)
- [ ] Security hardening review
- [ ] HTTPS / TLS setup
- [ ] Mobile app build and deployment (Expo EAS or similar)
- [ ] Backend deployment (containerized or hosted)
- [ ] Final end-to-end QA pass
