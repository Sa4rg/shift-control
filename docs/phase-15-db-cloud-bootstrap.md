# Phase 15.4 — DB Cloud Readiness & First-Admin Bootstrap

## Scope

This phase addresses:

1. Verification of DB cloud readiness for Supabase PostgreSQL.
2. Confirmation that Flyway migrations are reproducible from an empty DB.
3. First-admin bootstrap mechanism for staging/production first deploy.
4. Documentation for the Render + Supabase architecture.
5. Backup strategy recommendation.

No schema changes were made. No Docker/deploy changes. No API contract changes. No mobile changes.

---

## 1. Target Architecture: Render + Supabase

```
[Expo Mobile App]
       │
       ▼ HTTPS
[Render — Spring Boot backend]
       │
       ▼ JDBC over SSL (port 5432)
[Supabase — PostgreSQL 15]
```

- **Backend runtime:** Render web service (Java 21, Spring Boot).
- **Database:** Supabase PostgreSQL — managed, hosted PostgreSQL.
- **Connection:** JDBC with `sslmode=require` (mandatory for Supabase).
- **Schema management:** Flyway migrations applied at startup.

---

## 2. User & Admin Model

The `users` table enforces DB-level constraints that determine what makes a valid ADMIN:

| Field | ADMIN rule |
|---|---|
| `id` | UUID, generated |
| `full_name` | NOT NULL |
| `username` | NOT NULL, UNIQUE |
| `email` | Nullable (no constraint forces ADMIN to have email) |
| `pin_hash` | NULL — ADMIN does not use PIN |
| `password_hash` | NOT NULL — enforced by `users_admin_password_required` CHECK |
| `role` | `'ADMIN'` |
| `store_id` | NULL — enforced by `users_admin_store_null` CHECK |
| `active` | true for operational admin |
| `deactivated_by` | NULL |
| `deactivated_at` | NULL |

Authentication: Admin logs in with `username + password` (Argon2-hashed).

---

## 3. Flyway Readiness

- **Migrations:** V1 through V13, covering stores, users, shifts, sales, closures, incidents, and audit columns.
- **`ddl-auto=validate`:** Hibernate validates schema against entity model; Flyway manages changes.
- **Flyway enabled** in all profiles including staging and production.
- **No data in migrations:** No user records, no credentials, no seed data in any migration file.
- **Reproducibility:** Testcontainers integration tests (`IntegrationTestBase`) use `postgres:16-alpine` and apply all Flyway migrations from scratch on each test run. This confirms migrations are reproducible.

Supabase JDBC URL format:
```
jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

The `?sslmode=require` parameter is mandatory for all Supabase connections.

---

## 4. Required Render Environment Variables

Configure these in the Render environment variables panel. **Never commit real credentials.**

### Core

| Variable | Description |
|---|---|
| `SPRING_PROFILES_ACTIVE` | Set to `staging` or `prod` |
| `DATABASE_URL` | Supabase JDBC URL with `?sslmode=require` |
| `DATABASE_USERNAME` | Supabase database username (typically `postgres`) |
| `DATABASE_PASSWORD` | Supabase database password |
| `JWT_SECRET` | Minimum 32 bytes of secure random data |
| `JWT_EXPIRATION_SECONDS` | Token lifetime in seconds. Default: `43200` (12h) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins. Required in staging/prod. |

Generate a secure JWT secret:
```bash
openssl rand -base64 64
```

### Bootstrap (first deploy only)

| Variable | Description |
|---|---|
| `BOOTSTRAP_ADMIN_ENABLED` | `true` only during first deploy. Must be `false` afterwards. |
| `BOOTSTRAP_ADMIN_USERNAME` | Username for the initial admin |
| `BOOTSTRAP_ADMIN_PASSWORD` | Temporary password — minimum 12 characters |
| `BOOTSTRAP_ADMIN_FULL_NAME` | Display name (optional, defaults to "Initial Admin") |
| `BOOTSTRAP_ADMIN_EMAIL` | Admin email (optional) |
| `BOOTSTRAP_ADMIN_FAIL_IF_EXISTS` | `false` — skip silently if admin already exists |

---

## 5. First Deploy Sequence

### Step 1 — Create Supabase project
1. Create a new project at [supabase.com](https://supabase.com).
2. Note the project reference (`<project-ref>` in the JDBC URL).
3. Go to **Project Settings → Database** and copy:
   - Host: `db.<project-ref>.supabase.co`
   - Database: `postgres`
   - Username: `postgres`
   - Password: (shown once — save it securely)
4. Build the JDBC URL:
   ```
   jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
   ```

### Step 2 — Create Render service
1. Create a new Render web service pointing to the backend repository.
2. Set runtime to Java 21.
3. Set build command: `./mvnw -DskipTests=true package`
4. Set start command: `java -jar target/*.jar`

### Step 3 — Set Render environment variables
Configure all variables listed in Section 4 above.

For the first deploy, temporarily set:
```
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=<strong temporary password — min 12 chars>
BOOTSTRAP_ADMIN_FULL_NAME=Initial Admin
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
```

### Step 4 — Deploy
1. Trigger the first deploy.
2. Flyway applies all V1–V13 migrations to the empty Supabase database.
3. `AdminBootstrapRunner` creates the first ADMIN user.
4. Check Render logs — you should see the application started successfully.

### Step 5 — Verify admin login
1. Call `POST /api/auth/admin/login` with the bootstrap username and password.
2. Confirm you receive a valid JWT token.

### Step 6 — Disable bootstrap immediately
1. In Render environment variables panel, set:
   ```
   BOOTSTRAP_ADMIN_ENABLED=false
   ```
2. Clear `BOOTSTRAP_ADMIN_PASSWORD` (set to empty or remove the variable).
3. Restart the Render service.
4. Confirm the app starts without creating another admin.

### Step 7 — Rotate the bootstrap password
The bootstrap password is temporary. After step 5, rotate credentials using the admin management flow (admin create/deactivate/replace).

---

## 6. Bootstrap Mechanism Details

Class: `AdminBootstrapRunner` (`shared/config/AdminBootstrapRunner.java`)
Properties: `AdminBootstrapProperties` (`shared/config/AdminBootstrapProperties.java`)

### Behavior

| Condition | Action |
|---|---|
| `enabled=false` | Do nothing. Returns immediately. |
| `enabled=true`, no active admin exists | Create exactly one ADMIN user. |
| `enabled=true`, active admin exists, `failIfAdminExists=false` | Skip silently. No duplicate created. |
| `enabled=true`, active admin exists, `failIfAdminExists=true` | Throw `IllegalStateException`. Application fails to start. |
| `enabled=true`, username blank | Throw `IllegalStateException`. Application fails to start. |
| `enabled=true`, password blank or < 12 chars | Throw `IllegalStateException`. Application fails to start. |
| `enabled=true`, username already taken | Throw `IllegalStateException`. Application fails to start. |

### Security guarantees
- Plaintext password is never persisted. Argon2 hash is stored.
- Password is not logged at any level.
- Bootstrap cannot create a duplicate active admin.
- Disabled by default in all profiles (`app.bootstrap.admin.enabled=false`).

---

## 7. Backup Strategy

### Staging

- **Supabase free/pro tier:** Daily backups are included for Pro tier and above.
- **Free tier:** No automatic backups. Use manual `pg_dump` for staging data protection.
- **Manual backup:**
  ```bash
  pg_dump "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require" \
    -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump
  ```

### Production (before launch)

Before deploying to production, verify:
1. **Supabase plan level:** Confirm the plan includes daily automatic backups.
2. **Point-in-Time Recovery (PITR):** Available on Supabase Pro and Team plans. Enable it for production.
3. **Backup retention:** Know the retention period (7 days on Pro, configurable on Team).
4. **Manual test restore:** Before go-live, restore a staging backup to a test Supabase project to verify the restore process works.

### Rollback policy

- **Never edit an applied Flyway migration.** Once a migration has been applied to any environment, it is immutable.
- Roll forward with a new migration (V14, V15, ...) if a schema change is needed.
- Flyway's checksum validation will fail startup if a previously applied migration file is modified.

---

## 8. Security Notes

- **Never commit DB credentials** to the repository.
- **Never commit the bootstrap password** to the repository.
- **Do not leave bootstrap enabled** in a running service.
- **Do not expose a setup or seed HTTP endpoint.** Bootstrap is startup-only, not accessible via HTTP.
- **Rotate bootstrap password immediately** after first login.
- **Use env vars on Render** — never hardcode credentials in `application-staging.properties` or any tracked file.
- **`?sslmode=require`** must be present in all Supabase JDBC URLs to prevent unencrypted connections.

---

## 9. Files Changed in This Phase

| File | Change |
|---|---|
| `shared/config/AdminBootstrapProperties.java` | **New** — configuration properties for bootstrap |
| `shared/config/AdminBootstrapRunner.java` | **New** — application runner for first-admin bootstrap |
| `resources/application.properties` | Added bootstrap property mapping section |
| `resources/application-test.properties` | Explicitly set `app.bootstrap.admin.enabled=false` |
| `backend/.env.example` | Added bootstrap variables with placeholders |
| `backend/.env.staging.example` | Added bootstrap variables with placeholders |
| `backend/.env.production.example` | Added bootstrap variables with placeholders |
| `test/.../AdminBootstrapRunnerTest.java` | **New** — 12 unit tests covering all bootstrap behaviors |

---

## 10. Test Results

```
Tests run: 347, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Previous: 334 tests. Added: 13 new bootstrap unit tests.
