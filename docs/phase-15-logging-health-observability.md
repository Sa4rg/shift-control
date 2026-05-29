# Phase 15.5 — Logging, Health & Observability

## Scope

This phase adds production-safe observability to the Shift Control backend:

1. Spring Boot Actuator with a minimal, secure health endpoint.
2. Readiness/liveness probes via Spring Boot's health groups.
3. Structured SLF4J logging on auth, rate-limiting, bootstrap, and unexpected errors.
4. Request ID / correlation ID via MDC.
5. Logback format including requestId.

No schema changes. No API contract changes. No mobile changes. No external monitoring service.

---

## 1. Actuator Dependency

Added to `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

---

## 2. Exposed Endpoints

| Endpoint | Authentication required | Description |
|---|---|---|
| `/actuator/health` | No | Overall status — `{"status":"UP"}` or `{"status":"DOWN"}` |
| `/actuator/health/liveness` | No | JVM liveness state |
| `/actuator/health/readiness` | No | App readiness state (includes DB indicator) |

All other actuator endpoints (`/actuator/env`, `/actuator/beans`, etc.) are not exposed and are blocked by Spring Security (`anyRequest().denyAll()` → HTTP 401 for unauthenticated requests).

### Render health check path

```
/actuator/health
```

Configure this as the health check URL in the Render service settings.

---

## 3. Health vs Readiness

| Endpoint | What it reflects |
|---|---|
| `/actuator/health` | Combined status of all indicators (DB, disk, ping) |
| `/actuator/health/readiness` | Whether the app is ready to serve traffic (DB must be UP) |
| `/actuator/health/liveness` | Whether the JVM is alive (rarely fails unless OOM) |

For Render, `/actuator/health` is sufficient as the single health check path.

---

## 4. Detail Exposure per Profile

| Profile | `show-details` | Response |
|---|---|---|
| `dev` | `always` | Full breakdown: DB indicator, disk, ping |
| `staging` | `never` (default) | `{"status":"UP"}` only |
| `prod` | `never` (default) | `{"status":"UP"}` only |
| `test` | `never` (default) | `{"status":"UP"}` only |

In staging and prod, no internal details (DB connection info, disk paths, etc.) are exposed.

---

## 5. Logging Strategy

### Log format (`logback-spring.xml`)

```
%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} [rid=%X{requestId:-none}] %msg%n
```

Console-based output for Render (stdout). No external log aggregator in this phase.

### Log levels (`application.properties`)

```properties
logging.level.root=INFO
logging.level.com.shiftcontrol.backend=INFO
logging.level.org.springframework.security=WARN
```

Dev profile override (`application-dev.properties`):

```properties
logging.level.com.shiftcontrol.backend=DEBUG
```

### Events logged

| Class | Level | Event |
|---|---|---|
| `AuthService` | INFO | `Login successful [role=STAFF/ADMIN, userId=<UUID>]` |
| `AuthService` | WARN | `Login attempt failed [role=STAFF/ADMIN]` |
| `LoginRateLimitFilter` | WARN | `Login rate limit exceeded [endpoint=<path>, clientIp=<ip>]` |
| `AdminBootstrapRunner` | INFO | `Bootstrap admin created successfully [userId=<UUID>]` |
| `AdminBootstrapRunner` | INFO | `Bootstrap skipped — active admin already exists` |
| `GlobalExceptionHandler` | ERROR | Unexpected exception with full stack trace (server-side only) |

---

## 6. Sensitive Data Rules

The following data is **never logged** at any level:

- Passwords (plain text or hashed)
- PINs (plain text or hashed)
- JWT tokens
- Authorization headers
- Database credentials
- Bootstrap secrets
- Full request bodies

Auth failure logs are always generic — they never reveal whether a username exists or which specific check failed.

---

## 7. Request ID / Correlation ID

Class: `RequestIdFilter` (`shared/security/RequestIdFilter.java`)

- Runs at `Ordered.HIGHEST_PRECEDENCE` — before Spring Security filters.
- Reads `X-Request-Id` from the request; generates a UUID if absent.
- Puts the ID in the SLF4J MDC under the key `requestId`.
- Returns the ID in the `X-Request-Id` response header.
- Clears the MDC key in the `finally` block — no leakage across threads.

Every log line produced during a request includes `[rid=<id>]`. This allows correlating all log events for a single request in Render's log stream.

---

## 8. Files Changed

| File | Change |
|---|---|
| `pom.xml` | Added `spring-boot-starter-actuator` |
| `resources/application.properties` | Actuator config + logging levels |
| `resources/application-dev.properties` | `show-details=always`, `logging.level=DEBUG` |
| `shared/security/SecurityConfig.java` | Permit `/actuator/health` and `/actuator/health/**` |
| `shared/exception/GlobalExceptionHandler.java` | Logger + ERROR log on unexpected exceptions |
| `auth/service/AuthService.java` | Logger + INFO/WARN on login events |
| `shared/security/LoginRateLimitFilter.java` | Logger + WARN on rate limit block |
| `shared/config/AdminBootstrapRunner.java` | Logger + INFO on lifecycle events |
| `test/.../AdminBootstrapRunnerTest.java` | Stub `save()` → `new User()` in 6 tests |

**New files:**

| File | Description |
|---|---|
| `shared/security/RequestIdFilter.java` | Correlation ID filter (MDC + response header) |
| `resources/logback-spring.xml` | Log format with requestId |
| `test/.../ActuatorHealthIntegrationTest.java` | 6 integration tests |
| `test/.../RequestIdFilterTest.java` | 5 unit tests |

---

## 9. Tests Added

### `RequestIdFilterTest` — 5 unit tests

1. Generates UUID when no `X-Request-Id` header is present.
2. Reuses the incoming `X-Request-Id` header value.
3. Clears MDC key after the request completes.
4. Always calls the filter chain.
5. Generates unique IDs for separate requests.

### `ActuatorHealthIntegrationTest` — 6 integration tests

1. `/actuator/health` is accessible without authentication (HTTP 200).
2. Response contains a `status` field.
3. `/actuator/env` without authentication returns HTTP 401.
4. `/actuator/beans` without authentication returns HTTP 401.
5. Response always includes an `X-Request-Id` header.
6. A provided `X-Request-Id` is echoed back in the response.

---

## 10. Known Limitations

- **No external monitoring:** No Sentry, Datadog, or Grafana in this phase.
- **No audit table:** Logs are console-based. No DB-persisted audit trail.
- **In-memory rate limit counters:** Lost on restart; not shared across instances (documented limitation from Phase 15.3).
- **Logs are console-only:** Render captures stdout. No structured JSON log format yet.
- **No alert integration:** Log-based alerting (e.g., via Render log drains) is not configured.

---

## 11. Future Recommendations

- **Sentry** for backend exception monitoring and mobile error tracking.
- **Structured JSON logging** (Logstash encoder) if centralized log aggregation is added later.
- **Log drain** on Render to forward logs to a log management service (Papertrail, Logtail, etc.).
- **Audit trail table** for critical admin actions (user deactivation, incident resolution) if compliance requires it.
- **Distributed rate limiting** (Redis-backed) if the backend scales beyond a single Render instance.

---

## 12. Test Results

```
Tests run: 358, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Previous: 347 tests. Added: 11 (5 unit + 6 integration).
