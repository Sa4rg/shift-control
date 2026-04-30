# Shift Control — Backend

Spring Boot REST API for the Shift Control application.

## Tech Stack

- **Java 21**
- **Spring Boot 4.0**
- **Spring Data JPA** + Hibernate
- **Spring Security** (JWT — in progress)
- **Spring Validation** (Bean Validation)
- **PostgreSQL 16**
- **Flyway** — versioned schema migrations
- **Lombok**
- **JUnit 5** + **Mockito** — unit tests

## Architecture

Modular monolith with light Clean Architecture principles.

```
com.shiftcontrol.backend
├── auth/
├── closures/
├── incidents/
├── reports/
├── sales/
├── shared/         ← response wrapper, exceptions, security config
├── shifts/
├── stores/
└── users/
```

Each module follows the same internal structure:

```
{module}/
├── controller/     ← HTTP layer only, no business logic
├── service/        ← business rules and coordination
├── repository/     ← persistence abstraction
├── model/          ← JPA entities
└── dto/            ← request and response records
```

## Running Locally

### Prerequisites

- Java 21+
- Docker (for PostgreSQL)

### 1. Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

Database: `shift_control` · User: `shift_control_user` · Port: `5432`

### 2. Run the application

```bash
./mvnw spring-boot:run
```

API available at `http://localhost:8080`.

### 3. Run tests

```bash
./mvnw test
```

Unit tests run without a database connection — no Docker required for tests.

## API Endpoints

All responses follow a consistent envelope:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

### Stores

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stores` | List all stores |
| `GET` | `/api/stores/{id}` | Get store by ID |
| `POST` | `/api/stores` | Create a new store |

### Authentication _(in progress)_

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login (STAFF with PIN · ADMIN with password) |

## Database Migrations

Schema is managed by Flyway. Migration files are in:

```
src/main/resources/db/migration/
├── V1__create_stores_and_users_tables.sql
└── V2__add_updated_at_to_stores_and_users.sql
```

Never modify existing migration files. Add a new versioned file for every schema change.

## Key Design Decisions

- `BigDecimal` is used for all monetary values — never `double` or `float`.
- Sales are never physically deleted — cancelled sales are marked with a status flag.
- A closed shift cannot be reopened. Corrections go through incidents.
- The store cash register is expected to hold **103 EUR** after each closing.
- Credentials (PINs and passwords) are always stored hashed with BCrypt.
- Secrets are never hardcoded — use environment variables or a local ignored config file.
