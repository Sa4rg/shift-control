# Phase 15.6 — Docker Backend + Railway Deploy Preparation

## Scope

This document covers the backend Docker packaging and Railway deploy preparation for Shift Control.

**Target architecture:**
```
Expo mobile app → HTTPS → Railway backend (Docker) → Supabase PostgreSQL
```

**In scope:**
- Production Dockerfile (multi-stage, non-root, JRE 21)
- `.dockerignore` for safe build context
- PORT env var compatibility for Railway
- Railway service setup steps
- Required Railway environment variables
- Supabase JDBC connection format
- First staging deploy sequence
- Rollback and security notes

**Out of scope (not implemented in this phase):**
- Actual deployment (no resources created or modified)
- Supabase project creation
- CI/CD pipeline
- Refresh tokens
- External monitoring services
- Frontend / mobile deploy
- `railway.toml` config file (deferred — variables must be managed in Railway dashboard manually)

**Portability note:**  
The Dockerfile is platform-agnostic. It can be deployed later on Render, Google Cloud Run, Fly.io, or AWS ECS without modification, as long as `PORT` and the other required env vars are provided.

---

## 1. Dockerfile Overview

**Location:** `backend/Dockerfile`

**Strategy:** Multi-stage build.

| Stage | Base image | Purpose |
|---|---|---|
| `builder` | `maven:3.9-eclipse-temurin-21` | Compile and package the Spring Boot fat jar |
| `runtime` | `eclipse-temurin:21-jre-jammy` | Lean JRE image running the jar as a non-root user |

**Why `eclipse-temurin:21-jre-jammy` (not Alpine)?**  
Ubuntu 22.04 LTS provides maximum reliability with the PostgreSQL JDBC driver and BouncyCastle on Railway's Linux environment. Alpine (musl libc) is smaller but can introduce DNS or TLS edge cases in containerized environments. Reliability is preferred over a minimal image size difference.

**Why a Maven base image in the builder?**  
The Maven wrapper (`mvnw`) uses `distributionType=only-script`, which downloads Maven from the internet on first run. A Maven base image avoids this dependency and makes builds fully reproducible without external downloads.

**Non-root user:** A system user `appuser` in group `appgroup` is created in the runtime stage. The jar is owned by this user. The process never runs as root.

**JVM options at runtime:**
```
-XX:+UseContainerSupport       # Respect cgroup memory limits (default in Java 11+, explicit here)
-XX:MaxRAMPercentage=75.0      # Limit heap to 75% of container RAM; leaves room for non-heap
-Djava.security.egd=file:/dev/./urandom  # Non-blocking entropy source for faster startup on Linux
```

**PORT compatibility:**  
`application.properties` uses `server.port=${PORT:8080}`. Railway injects a `PORT` env var for each service; the app picks it up automatically. Defaults to `8080` locally.

---

## 2. Local Validation Commands

### 2.1 Run backend tests (always run before building the image)

```bash
cd backend
./mvnw test
```

### 2.2 Build the Docker image

From the repo root (build context = `backend/` directory):

```bash
docker build -t shift-control-backend:local -f backend/Dockerfile backend
```

Or from inside the `backend/` directory:

```bash
cd backend
docker build -t shift-control-backend:local .
```

### 2.3 Inspect the image (optional)

```bash
# Confirm the non-root user is active and the jar is present
docker run --rm shift-control-backend:local id
docker run --rm shift-control-backend:local ls -la /app/
```

### 2.4 Run locally with dev DB

> Requires the local PostgreSQL container running (see `docker-compose.yml` at the repo root).  
> Do not use a fake `DATABASE_URL` — the app will refuse to start by design.

```bash
# Start local PostgreSQL
docker compose up -d

# Run the containerised backend against the local DB
docker run --rm \
  --network host \
  -e SPRING_PROFILES_ACTIVE=dev \
  -e JWT_SECRET=local-dev-jwt-secret-must-be-at-least-32-bytes \
  shift-control-backend:local
```

---

## 3. Railway Service Setup

### 3.1 Create the project and service

1. Log in to [railway.app](https://railway.app).
2. Click **New Project → Deploy from GitHub repo**.
3. Select the repository.
4. Railway will create a new service automatically.

### 3.2 Configure the Dockerfile path

Railway needs to know where the Dockerfile is located relative to the repo root.

**Option A — Set Root Directory to `backend` (recommended):**

In the service settings → **Source** tab:
- Set **Root Directory** to `backend`
- Railway will then use `backend/Dockerfile` as the build context automatically.

**Option B — Set Dockerfile path explicitly:**

In the service settings → **Build** tab:
- Leave Root Directory as the repo root.
- Set **Dockerfile Path** to `backend/Dockerfile`.
- Note: the build context will then be the repo root; `backend/src` and `backend/pom.xml` must be accessible from there.

> Recommendation: use **Option A** (Root Directory = `backend`) because `backend/.dockerignore` already scopes the build context correctly.

### 3.3 Public domain

In the service settings → **Networking** tab:
- Click **Generate Domain** to get a `*.railway.app` URL.
- This URL is the base URL for the mobile app's API.

### 3.4 Health check

In the service settings → **Deploy** tab:
- Set **Health Check Path** to `/actuator/health`.
- The endpoint returns `{"status":"UP"}` with HTTP 200 when the app and database are healthy.
- No authentication is required.

### 3.5 Auto-deploy branch

Decide which branch triggers automatic deploys before going live.

| Environment | Branch |
|---|---|
| Staging | `main` or `staging` |
| Production | `production` or a tagged release |

---

## 4. Required Railway Environment Variables

Set all variables in the Railway service → **Variables** tab.  
Never commit these values to the repository.

### 4.1 Core runtime

| Variable | Value | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `staging` | Use `prod` for production |
| `PORT` | *(managed by Railway)* | Do NOT set manually — Railway injects this automatically |

### 4.2 Database (Supabase)

| Variable | Example value | Notes |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://db.<ref>.supabase.co:5432/postgres?sslmode=require` | See Section 5 |
| `DATABASE_USERNAME` | `postgres` | Supabase default |
| `DATABASE_PASSWORD` | `<supabase-db-password>` | From Supabase dashboard |

### 4.3 JWT

| Variable | Example value | Notes |
|---|---|---|
| `JWT_SECRET` | `<32+ byte random secret>` | Generate with `openssl rand -hex 32` |
| `JWT_EXPIRATION_SECONDS` | `43200` | 12 hours — default for staging/prod |

### 4.4 CORS

| Variable | Example value | Notes |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://<your-railway-domain>.railway.app` | Must match the public URL used by the mobile app |

> Leaving `CORS_ALLOWED_ORIGINS` empty will cause the app to **fail at startup** in staging/prod profiles (fail-fast `CorsValidationConfig`). Set it before the first deploy.

### 4.5 Bootstrap admin (first deploy only)

| Variable | Value | Notes |
|---|---|---|
| `BOOTSTRAP_ADMIN_ENABLED` | `true` | Only for first deploy to a clean DB |
| `BOOTSTRAP_ADMIN_USERNAME` | `admin` | Choose a non-obvious username |
| `BOOTSTRAP_ADMIN_PASSWORD` | `<strong-random-password>` | Use a long random password |
| `BOOTSTRAP_ADMIN_FULL_NAME` | `Initial Admin` | Optional display name |
| `BOOTSTRAP_ADMIN_EMAIL` | `admin@example.com` | Optional |
| `BOOTSTRAP_ADMIN_FAIL_IF_EXISTS` | `false` | Safe default for first deploy |

> **Security:** Disable bootstrap immediately after the first admin is created. See Section 6.

---

## 5. Supabase JDBC Connection Format

```
jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

- Replace `<project-ref>` with the Supabase project reference (visible in the Supabase dashboard URL or project settings).
- `sslmode=require` is mandatory — Supabase does not accept unencrypted connections.
- Username: `postgres`
- Password: the database password from the Supabase dashboard → Project Settings → Database.

Example (never use real credentials in the repo):
```
DATABASE_URL=jdbc:postgresql://db.abcdefghijklmnop.supabase.co:5432/postgres?sslmode=require
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<placeholder>
```

---

## 6. First Staging Deploy Sequence

Follow this sequence exactly for the first deploy to a clean staging environment.

1. **Create the Supabase project** — note the project reference and database password.

2. **Configure all Railway environment variables** (Section 4) — database, JWT, CORS, and bootstrap admin values.

3. **Set `BOOTSTRAP_ADMIN_ENABLED=true`** — only for this first deploy.

4. **Trigger the Railway deploy** — push to the configured branch or click **Deploy** in the Railway dashboard.

5. **Monitor the deploy logs** in Railway (service → **Deployments** → latest deploy → **View logs**). Confirm:
   - Spring Boot starts without errors.
   - Flyway runs all migrations (look for `Successfully applied N migrations to schema "public"`).
   - Bootstrap admin is created (look for `Bootstrap admin created successfully`).

6. **Confirm `/actuator/health`** — make a GET request to `https://<railway-domain>/actuator/health`. Expected:
   ```json
   { "status": "UP" }
   ```

7. **Confirm Flyway ran** — check logs for Flyway migration output (look for `flyway.core.Flyway`).

8. **Confirm first admin login** — POST to `/api/auth/admin/login` with the bootstrap credentials. Confirm a JWT is returned.

9. **Disable bootstrap** — in Railway variables:
   - Set `BOOTSTRAP_ADMIN_ENABLED=false`
   - Remove or clear `BOOTSTRAP_ADMIN_PASSWORD`

10. **Restart the Railway service** — required for the env var changes to take effect.  
    In the Railway dashboard → service → **Settings** → **Restart**.

11. **Verify bootstrap is disabled** — confirm the admin from step 8 can still log in, and that no new bootstrap admin would be created on restart.

---

## 7. Rollback Notes

### 7.1 Railway deploy rollback

If the app fails to start or the health check fails after a deploy:
1. In Railway → service → **Deployments** tab, find the last successful deployment.
2. Click the three-dot menu → **Rollback**.

### 7.2 Database schema

**Never edit applied Flyway migrations.** Flyway verifies checksums on startup; modifying an already-applied migration will cause the app to refuse to start with a checksum mismatch error.

DB schema rollback is **roll-forward only**: create a new migration (e.g., `V14__revert_change.sql`) to undo a previous change.

---

## 8. Security Notes

- **No secrets in the Docker image.** The Dockerfile copies only compiled code. No `.env` files, no credentials, no application-prod.properties baked into the image.
- **No secrets in the repository.** `.env.*` files are in `.gitignore`. Profile-specific properties files use `${ENV_VAR}` references without fallback values for secrets.
- **Use Railway variables** for all sensitive configuration. Railway encrypts variables at rest.
- **Do not leave bootstrap enabled.** `BOOTSTRAP_ADMIN_ENABLED=true` must be changed to `false` immediately after the first admin is created and the service restarted.
- **HTTPS only on mobile.** The Expo mobile app must use the `https://` Railway domain URL, not `http://`. Railway provides TLS termination automatically for all generated domains.
- **CORS validation is enforced at startup.** An empty `CORS_ALLOWED_ORIGINS` in staging/prod profiles causes a fail-fast error. This prevents accidentally deploying without CORS configured.

---

## 9. Known Limitations

| Limitation | Notes |
|---|---|
| In-memory rate limiting | `LoginRateLimitFilter` stores attempt counters in memory. With multiple Railway replicas, each replica has its own counter. Single-instance staging deployments are not affected. |
| Console-only logs | Logs go to stdout. Railway captures and displays them in the dashboard. No structured log shipping or external log aggregation is configured yet. |
| No external monitoring | No APM (Application Performance Monitoring), error tracking (e.g., Sentry), or uptime monitoring is configured yet. |
| No CI/CD pipeline | Railway auto-deploy is branch-triggered. No formal CI/CD pipeline is implemented (see `Jenkinsfile` for local CI reference). |
| No refresh tokens | JWT tokens expire after `JWT_EXPIRATION_SECONDS` (12h default in staging/prod). Users must re-authenticate. Refresh tokens are deferred to a future phase. |

---

## 10. Future Portability

The backend Dockerfile is platform-agnostic. It can be moved to any container hosting platform that:
- Accepts a Dockerfile build.
- Provides a `PORT` env var (or equivalent).
- Injects runtime env vars.

**Tested compatible platforms (no Dockerfile changes needed):**

| Platform | Notes |
|---|---|
| Railway | Current target (this document) |
| Render | Set Root Directory to `backend`; health check path `/actuator/health` |
| Google Cloud Run | Inject `PORT` (Cloud Run does this by default); connect to Cloud SQL via JDBC |
| Fly.io | Set `[env] PORT` or use the default; add `fly.toml` for routing |
| AWS ECS / Fargate | Pass env vars via task definition; expose port 8080 |

---

## 11. Files Changed in This Phase

| File | Change |
|---|---|
| `backend/src/main/resources/application.properties` | `server.port` changed from `8080` to `${PORT:8080}` |
| `backend/Dockerfile` | Created — multi-stage build, non-root user, JRE 21 Jammy |
| `backend/.dockerignore` | Created — excludes `target/`, secrets, IDE folders, logs |
| `docs/phase-15-docker-railway-deploy.md` | Created — this document |
