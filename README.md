# Shift Control

Internal tool for shift sales control, cash closing, incident tracking, and weekly admin review.

## What is this?

Shift Control is a mobile-first web application built for internal store operations. It replaces manual paper-based processes with a structured digital workflow for staff and administrators.

This is **not** a POS, an inventory system, or a billing platform. It is a tool to:

- Register paid sales during a staff shift grouped by payment method.
- Track whether each sale was invoiced.
- Calculate shift closing totals (cash, card, Glovo).
- Document cash and card terminal differences at closing.
- Allow administrators to review weekly totals by staff member and store.

## Roles

| Role | Responsibilities |
|------|-----------------|
| **STAFF** | Opens a shift, registers sales, closes their own shift |
| **ADMIN** | Reviews stores, staff, shift closures, weekly summaries, and incidents |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 21 · Spring Boot 4.0 |
| Database | PostgreSQL 16 |
| Migrations | Flyway |
| Auth | JWT (STAFF: username + PIN · ADMIN: username + password) |
| Infrastructure | Docker Compose |

## Project Structure

```
shift-control/
├── backend/          # Spring Boot API
├── docs/             # Business rules, domain model, user stories, requirements
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Java 21+
- Docker and Docker Compose

### 1. Start the database

```bash
docker compose up -d
```

### 2. Run the backend

```bash
cd backend
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

## Documentation

Additional context is available in the [`docs/`](docs/) folder:

- [`business-rules.md`](docs/business-rules.md) — domain rules and constraints
- [`domain-model.md`](docs/domain-model.md) — entity relationships
- [`product-requirements.md`](docs/product-requirements.md) — feature requirements
- [`user-stories.md`](docs/user-stories.md) — user stories by role

## Status

This project is in active development. The MVP covers a single store.

Current progress:

- [x] Database schema (stores, users)
- [x] Stores API (list, create, get by ID)
- [ ] Authentication (JWT)
- [ ] Shifts module
- [ ] Sales module
- [ ] Closures module
- [ ] Incidents module
- [ ] Reports module
