# Phase 15.2 — Config/Env Hardening

**Status:** Complete  
**Date:** 2026-05-28  
**Scope:** Backend and mobile environment configuration hardening. No deployments, no Docker, no business logic changes.

---

## 1. Environment Strategy

Three active profiles:

| Profile    | Purpose                                   | DB source              |
|------------|-------------------------------------------|------------------------|
| `dev`      | Local developer machine                   | Local PostgreSQL       |
| `staging`  | Render-hosted staging backend             | Supabase PostgreSQL    |
| `prod`     | Render-hosted production backend          | Supabase PostgreSQL    |

Test runs use `test` profile via Testcontainers — isolated from all environments above.

Profile is activated via the `SPRING_PROFILES_ACTIVE` environment variable:

```
SPRING_PROFILES_ACTIVE=dev       # local
SPRING_PROFILES_ACTIVE=staging   # Render staging
SPRING_PROFILES_ACTIVE=prod      # Render production
```

---

## 2. Current Target Architecture

```
Mobile App (Expo / React Native)
        │
        │ HTTPS
        ▼
Render Backend (Java 21 + Spring Boot)
        │
        │ SSL/TLS (sslmode=require)
        ▼
Supabase PostgreSQL (staging / prod)
```

- **Mobile app** connects to the backend API URL configured via `EXPO_PUBLIC_API_BASE_URL`.
- **Backend** is deployed on Render (free or paid tier).
- **Database** is hosted on Supabase. The JDBC connection string must include `?sslmode=require`.

---

## 3. Backend Required Variables

All variables must be set in the Render environment variables panel (not in committed files).

| Variable                   | Required in       | Description                                              |
|----------------------------|-------------------|----------------------------------------------------------|
| `SPRING_PROFILES_ACTIVE`   | all               | Active Spring profile (`dev`, `staging`, `prod`)         |
| `DATABASE_URL`             | staging, prod     | Full JDBC URL including SSL mode                         |
| `DATABASE_USERNAME`        | staging, prod     | Database user                                            |
| `DATABASE_PASSWORD`        | staging, prod     | Database password                                        |
| `JWT_SECRET`               | all               | Random secret, minimum 32 bytes                          |
| `JWT_EXPIRATION_SECONDS`   | optional          | JWT lifetime in seconds (default: 43200 for prod/staging)|
| `CORS_ALLOWED_ORIGINS`     | staging, prod     | Comma-separated list of allowed origins (**required**)   |

> **Note:** In `dev` profile, `DATABASE_URL`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD` are
> hardcoded in `application-dev.properties` (which is gitignored). CORS is hardcoded for localhost.

---

## 4. Mobile Required Variables

| Variable                   | Required | Description                          |
|----------------------------|----------|--------------------------------------|
| `EXPO_PUBLIC_API_BASE_URL` | yes      | Backend API base URL (no trailing /) |

**Important:** `EXPO_PUBLIC_*` variables are bundled into the compiled app binary. Do **not** put
secrets, tokens, API keys, or passwords in these variables. They are visible in the app.

Reference files:
- `.env.example` — local development
- `.env.staging.example` — staging builds
- `.env.production.example` — production builds

---

## 5. Render Environment Variable Mapping

When creating or updating a Render service, add these environment variables manually in the
Render dashboard under **Environment**:

**Staging service:**
```
SPRING_PROFILES_ACTIVE   = staging
DATABASE_URL             = jdbc:postgresql://db.<ref>.supabase.co:5432/postgres?sslmode=require
DATABASE_USERNAME        = postgres
DATABASE_PASSWORD        = <supabase-password>
JWT_SECRET               = <random-64-byte-base64>
JWT_EXPIRATION_SECONDS   = 43200
CORS_ALLOWED_ORIGINS     = https://shift-control-staging.onrender.com
```

**Production service:**
```
SPRING_PROFILES_ACTIVE   = prod
DATABASE_URL             = jdbc:postgresql://db.<ref>.supabase.co:5432/postgres?sslmode=require
DATABASE_USERNAME        = postgres
DATABASE_PASSWORD        = <supabase-password>
JWT_SECRET               = <random-64-byte-base64>
JWT_EXPIRATION_SECONDS   = 43200
CORS_ALLOWED_ORIGINS     = https://admin.your-domain.com
```

---

## 6. Supabase Connection Notes

- Connection string uses the **direct connection** format (port 5432), not the Supabase pooler.
- SSL is **mandatory**: append `?sslmode=require` to the URL.
- The database name is `postgres` by default in Supabase projects.
- Credentials are found in Supabase dashboard → Project Settings → Database.
- For future scaling, evaluate Supabase connection pooling (PgBouncer) if connection limits are hit.

JDBC format:
```
jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

---

## 7. CORS Policy

### Development
CORS is pre-configured for local development in `application-dev.properties`:
```
app.cors.allowed-origins=http://localhost:5173,http://localhost:3000,http://localhost:8081
```
No env var needed in dev.

### Staging and Production
`CORS_ALLOWED_ORIGINS` is **required**. If it is empty or not set, the application will **refuse
to start** with the error:

```
CORS_ALLOWED_ORIGINS must be configured for staging/production
```

This is enforced in `CorsValidationConfig` via `@PostConstruct`.

**Rules:**
- Do **not** use wildcard `*` in staging or production.
- List only actual origins that need cross-origin access (admin web clients, future web dashboards).
- The React Native mobile app does not require CORS for API calls when running natively — but
  correct CORS config is important for browser-based admin tools and security hygiene.

### Test
`application-test.properties` sets a fixed `http://localhost:8080` origin for test safety.
No env var needed in test.

---

## 8. JWT Expiration Decision

**Decision:** Use 12-hour JWT (43200 seconds) for staging and production.

**Rationale:**
- The app is an **internal** tool used by store staff during a work shift.
- Typical shift duration: 4–8 hours.
- 12-hour expiration avoids forced re-login mid-shift without requiring refresh tokens.
- Refresh tokens add significant complexity (rotation, revocation, storage) and are not justified
  for the current internal user base.

**Defaults by profile:**

| Profile  | Default expiration   | Source                                   |
|----------|----------------------|------------------------------------------|
| dev      | 86400s (24h)         | `application-dev.properties`             |
| staging  | 43200s (12h)         | `application-staging.properties`         |
| prod     | 43200s (12h)         | `application-prod.properties`            |
| test     | 3600s (1h)           | `application-test.properties` hardcoded  |

All defaults can be overridden via `JWT_EXPIRATION_SECONDS` env var.

**Revisit trigger:** Before rolling out to external users or if regulatory requirements change,
implement refresh token rotation.

---

## 9. Secrets Policy

| Rule                                          | Status    |
|-----------------------------------------------|-----------|
| No secrets hardcoded in source code           | Enforced  |
| `.env` files are gitignored                   | Enforced  |
| `.env.example` files are committed            | Enforced  |
| `application-dev.properties` is gitignored    | Enforced (root .gitignore) |
| `application-prod.properties` is gitignored   | Enforced (root .gitignore) |
| `application-staging.properties` is tracked   | Intentional — no secrets, env vars only |
| JWT secret has no fallback in staging/prod     | Enforced  |
| CORS_ALLOWED_ORIGINS has no silent empty pass  | Enforced via CorsValidationConfig |

**How to generate a JWT secret:**
```bash
openssl rand -base64 64
```

---

## 10. Validation Commands

### Backend
Run from `backend/` directory:
```bash
./mvnw test
```

### Mobile
Run from `shift-control-mobile/` directory:
```bash
pnpm exec tsc --noEmit
pnpm test
pnpm lint
```

### Git safety check (confirm no secrets are tracked)
```bash
git ls-files backend/src/main/resources/
git ls-files backend/.env*
git ls-files shift-control-mobile/.env*
```

Only `application.properties`, `application-test.properties`, `application-staging.properties`,
and Flyway migrations should appear. `.env` files must not appear.

---

## 11. File Reference

### New files added in this phase

| File                                         | Purpose                                      |
|----------------------------------------------|----------------------------------------------|
| `backend/src/main/resources/application-staging.properties` | Staging Spring profile config  |
| `backend/src/main/java/.../CorsValidationConfig.java`       | CORS fail-fast validator        |
| `backend/.env.example`                       | All backend env vars documented              |
| `backend/.env.staging.example`               | Staging-specific env var reference           |
| `backend/.env.production.example`            | Production-specific env var reference        |
| `shift-control-mobile/.env.example`          | Mobile env var reference (dev)               |
| `shift-control-mobile/.env.staging.example`  | Mobile env var reference (staging)           |
| `shift-control-mobile/.env.production.example` | Mobile env var reference (production)      |

### Modified files

| File                                         | Change                                           |
|----------------------------------------------|--------------------------------------------------|
| `backend/src/main/resources/application-prod.properties` | JWT expiration default 3600→43200  |
| Root `.gitignore`                            | Added `.env.*` and `!.env.*.example` rules       |
| `shift-control-mobile/.gitignore`            | Added comprehensive `.env` ignore rules          |
