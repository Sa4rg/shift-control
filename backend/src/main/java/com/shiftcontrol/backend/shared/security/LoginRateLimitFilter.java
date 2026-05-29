package com.shiftcontrol.backend.shared.security;

import com.shiftcontrol.backend.shared.config.LoginRateLimitProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servlet filter that rate-limits POST requests to the staff and admin login endpoints.
 *
 * Counters are stored in-memory per (IP, endpoint) key.
 * This is intentionally simple for the current single-instance Render deployment.
 *
 * Known limitations:
 * - In-memory only: counters are lost on restart and not shared across instances.
 *   For multi-instance deployments, replace with Redis-backed distributed rate limiting.
 * - X-Forwarded-For header is trusted as-is without explicit proxy trust configuration.
 *   On Render the header is set by Render's proxy, but a client behind a custom proxy
 *   could inject their own X-Forwarded-For value. Document and revisit for public rollout.
 *
 * Registered in SecurityConfig before JwtAuthenticationFilter so rate limiting happens
 * before expensive Argon2 credential verification.
 */
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    static final String STAFF_LOGIN_PATH = "/api/auth/staff/login";
    static final String ADMIN_LOGIN_PATH = "/api/auth/admin/login";

    private static final String TOO_MANY_ATTEMPTS_JSON =
            "{\"success\":false,\"message\":\"Too many login attempts. Please try again later.\",\"data\":null}";

    private final LoginRateLimitProperties properties;

    /**
     * key: "clientIp:requestPath"
     * value: long[2] — { attemptCount, windowStartMillis }
     */
    private final ConcurrentHashMap<String, long[]> buckets = new ConcurrentHashMap<>();

    public LoginRateLimitFilter(LoginRateLimitProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if (!properties.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String method = request.getMethod();

        // Never rate limit OPTIONS preflight requests
        if ("OPTIONS".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Only rate limit POST requests
        if (!"POST".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();

        // Only rate limit login endpoints
        if (!STAFF_LOGIN_PATH.equals(path) && !ADMIN_LOGIN_PATH.equals(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        int maxAttempts = STAFF_LOGIN_PATH.equals(path)
                ? properties.getStaffMaxAttempts()
                : properties.getAdminMaxAttempts();

        String clientIp = extractClientIp(request);
        String key = clientIp + ":" + path;

        if (isRateLimitExceeded(key, maxAttempts)) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(properties.getWindowSeconds()));
            response.getWriter().write(TOO_MANY_ATTEMPTS_JSON);
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Records the attempt and returns true if the limit has been exceeded.
     *
     * Uses an atomic ConcurrentHashMap.compute to avoid lost updates under concurrent load.
     * Minor edge case: two threads can both observe an expired window and both reset it.
     * For a low-traffic internal application, this is acceptable.
     */
    private boolean isRateLimitExceeded(String key, int maxAttempts) {
        long now = System.currentTimeMillis();
        long windowMillis = (long) properties.getWindowSeconds() * 1000;

        long[] result = buckets.compute(key, (k, existing) -> {
            if (existing == null) {
                return new long[]{1L, now};
            }
            if (now - existing[1] >= windowMillis) {
                // Window has expired — reset counter
                existing[0] = 1L;
                existing[1] = now;
            } else {
                existing[0]++;
            }
            return existing;
        });

        return result[0] > maxAttempts;
    }

    /**
     * Extracts the client IP from X-Forwarded-For (first value) or falls back to remoteAddr.
     *
     * On Render, X-Forwarded-For is set by the proxy. For internal deployments
     * this is sufficient. See class-level Javadoc for known limitations.
     */
    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Clears all rate limit buckets.
     * Package-private for use in unit tests only.
     */
    void clearBuckets() {
        buckets.clear();
    }
}
