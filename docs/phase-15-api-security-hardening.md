# Phase 15.3 — Backend API Security Hardening

## Scope

This phase performed a structured security review of the Shift Control backend API and implemented hardening measures in the following areas:

1. Authentication hardening review
2. Authorization hardening review
3. Input validation review
4. Login rate limiting
5. Security headers review
6. Tests proving security behavior

No DB schema changes, no API route changes, no mobile UI changes, no refresh tokens, no Docker/deploy changes.

---

## 1. Authentication — Review Results

| Item | Status | Notes |
|---|---|---|
| JWT secret validated at startup | ✅ Already in place | `JwtService` throws `IllegalStateException` on blank, short, or insecure secrets |
| Passwords/PINs hashed with Argon2 | ✅ Already in place | `PasswordEncoder` bean with Argon2 |
| Generic error message for failed login | ✅ Already in place | Same message for unknown user, wrong credential, inactive, wrong role |
| No sensitive data in JWT payload | ✅ Already in place | Only `userId`, `username`, `role` — no PIN, no password hash |
| Inactive users blocked | ✅ Already in place | `AuthService` checks `user.isActive()` before issuing a token |
| Login request DTOs validated | ✅ Already in place | `@NotBlank`, `@Size`, `@Pattern(regexp="\\d{6}")` on PIN |

No changes were required for authentication.

---

## 2. Authorization — Changes Made

### Incident resolve missing URL-level protection

**Problem:** `PATCH /api/incidents/{id}/resolve` was only protected at the service layer. A bug in `SecurityConfig` or a future refactor could silently remove the service check without any URL-level backstop.

**Fix:** Added URL-level rule to `SecurityConfig`:

```java
.requestMatchers(HttpMethod.PATCH, "/api/incidents/*/resolve").hasRole("ADMIN")
```

This creates **defense-in-depth**: the URL rule rejects STAFF tokens at the Spring Security layer before the request even reaches the controller, and the service-layer check (`resolvedBy.getRole() != Role.ADMIN`) independently enforces the same requirement.

**Tests added:** `IncidentResolveSecurityIntegrationTest` (6 tests)
- Unauthenticated → 401
- STAFF token → 403
- ADMIN token → 200 with resolved incident
- Already-resolved incident → 400
- STAFF cannot read another staff's incident
- STAFF cannot create incident for another staff's shift

---

## 3. Input Validation — Review Results

All request DTOs were reviewed:

| DTO | Annotations | Notes |
|---|---|---|
| `StaffLoginRequest` | `@NotBlank @Size(max=80)`, `@NotBlank @Pattern(regexp="\\d{6}")` | PIN format strictly enforced |
| `AdminLoginRequest` | `@NotBlank @Size(max=80)`, `@NotBlank @Size(max=120)` | |
| `CreateSaleRequest` | `@NotEmpty @Valid` on items/payments, `@Valid` on discounts, `@NotNull` on invoiceStatus, `@Size(max=500)` on note | |
| `CreateSaleItemRequest` | `@NotBlank @Size(max=160)`, `@Positive`, `@NotNull @Positive BigDecimal` | |
| `CreateSalePaymentRequest` | `@NotNull PaymentMethod`, `@NotNull @Positive BigDecimal` | |
| `CreateIncidentRequest` | `@NotNull` on type/severity, `@NotBlank @Size(max=160)` on title, `@NotBlank @Size(max=1000)` on description | |
| `ResolveIncidentRequest` | `@NotBlank @Size(max=1000)` on resolutionNote | |

No changes required. All boundaries are enforced with appropriate `@Valid` at the controller.

---

## 4. Login Rate Limiting — New Implementation

### Design decision

Chose an in-memory `ConcurrentHashMap` approach over Bucket4j due to Spring Boot 4.x compatibility uncertainty. The in-memory approach is intentionally simple for the current single-instance Render deployment.

### Configuration (`LoginRateLimitProperties`)

Prefix: `app.security.rate-limit.login`

| Property | Default | Description |
|---|---|---|
| `enabled` | `true` | Whether rate limiting is active |
| `window-seconds` | `60` | Duration of the rate limit window |
| `staff-max-attempts` | `10` | Max POST attempts per IP per window for staff login |
| `admin-max-attempts` | `5` | Max POST attempts per IP per window for admin login |

### Implementation (`LoginRateLimitFilter`)

- Extends `OncePerRequestFilter`, annotated `@Component`
- Only intercepts `POST` to `/api/auth/staff/login` and `/api/auth/admin/login`
- Skips `OPTIONS` preflight requests
- Tracks attempts per `clientIp:path` key
- Returns HTTP 429 with `Retry-After` header and consistent JSON error body when limit exceeded:

```json
{"success": false, "message": "Too many login attempts. Please try again later.", "data": null}
```

- IP extracted from `X-Forwarded-For` header (first value), fallback to `remoteAddr`

### Filter registration (SecurityConfig)

```java
.addFilterBefore(loginRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
```

`loginRateLimitFilter` is inserted first — Java's stable sort preserves insertion order for same-priority filters, ensuring rate limiting runs before JWT validation.

### Tests (`LoginRateLimitFilterTest`, 13 unit tests)

- Disabled filter always passes through
- GET to API endpoints not rate limited
- POST to non-login paths not rate limited
- OPTIONS preflight not rate limited
- Staff login within limit proceeds normally
- Staff login exceeding limit returns 429
- 429 response does not expose sensitive details (username, pin, password, stack traces)
- Admin login within limit proceeds normally
- Admin login exceeding limit returns 429
- Staff and admin limits are independent
- Different IPs have independent limits
- X-Forwarded-For header used as rate limit key
- Blocked request does not reach filter chain

### Profile configuration

| Profile | Rate limiting |
|---|---|
| dev | Enabled (default) |
| staging | Enabled (default) |
| prod | Enabled (default) |
| test | **Disabled** via `app.security.rate-limit.login.enabled=false` |

---

## 5. Security Headers — Review Results

Spring Security 6's default `HeaderWriterFilter` provides:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`
- `X-XSS-Protection: 0` (disabled per OWASP 2021 — not needed for JSON APIs, can cause issues in some browsers)

For this JSON API with no browser rendering, these defaults are sufficient. HSTS is handled by Render's reverse proxy (not the application layer). No changes required.

---

## 6. Error Handling — Review Results

`GlobalExceptionHandler` reviewed:

| Exception | HTTP Status | Response |
|---|---|---|
| `MethodArgumentNotValidException` | 400 | Field errors listed |
| `BusinessException` | 400 | Business rule message |
| `NotFoundException` | 404 | Not found message |
| `Exception` (catch-all) | 500 | Generic "Unexpected internal error" |

`server.error.include-stacktrace=never` in `application.properties`. No stack traces reach the client. No changes required.

---

## 7. Known Limitations

| Limitation | Severity | Mitigation |
|---|---|---|
| Rate limiting is in-memory (single-instance only) | Low — single Render instance for MVP | If scaled to multiple instances, replace with Redis-backed rate limiting (Bucket4j + Spring Data Redis) |
| X-Forwarded-For trusted without explicit proxy configuration | Low — Render proxy sets it reliably | Document for future review if app is placed behind a custom proxy |
| No refresh tokens | Low — accepted decision for internal app | 12h JWT expiration avoids mid-shift forced logout for staff |
| JWT expiration is fixed (not per-role) | Low | Staff need 12h for shifts; admin sessions at same expiry is acceptable |

---

## Files Changed

| File | Change |
|---|---|
| `shared/security/SecurityConfig.java` | Added ADMIN rule for `PATCH /api/incidents/*/resolve`; registered `LoginRateLimitFilter` |
| `shared/config/LoginRateLimitProperties.java` | **New** — configurable rate limit properties |
| `shared/security/LoginRateLimitFilter.java` | **New** — in-memory per-IP rate limiter for login endpoints |
| `resources/application.properties` | Added rate limit config documentation comments |
| `resources/application-test.properties` | Added `app.security.rate-limit.login.enabled=false` |
| `test/.../shared/security/LoginRateLimitFilterTest.java` | **New** — 13 unit tests |
| `test/.../integration/IncidentResolveSecurityIntegrationTest.java` | **New** — 6 integration tests |

---

## Test Run Results

```
Tests run: 334, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Previous: 315 tests. Added: 19 new tests (13 unit + 6 integration).
