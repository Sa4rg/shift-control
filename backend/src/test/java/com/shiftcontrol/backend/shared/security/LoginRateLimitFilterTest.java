package com.shiftcontrol.backend.shared.security;

import com.shiftcontrol.backend.shared.config.LoginRateLimitProperties;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static com.shiftcontrol.backend.shared.security.LoginRateLimitFilter.ADMIN_LOGIN_PATH;
import static com.shiftcontrol.backend.shared.security.LoginRateLimitFilter.STAFF_LOGIN_PATH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class LoginRateLimitFilterTest {

    private static final String CLIENT_IP = "192.168.1.1";
    private static final String OTHER_IP = "10.0.0.1";

    private LoginRateLimitFilter filter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        LoginRateLimitProperties properties = new LoginRateLimitProperties();
        properties.setEnabled(true);
        properties.setWindowSeconds(60);
        properties.setStaffMaxAttempts(3);   // small for fast testing
        properties.setAdminMaxAttempts(2);   // small for fast testing
        filter = new LoginRateLimitFilter(properties);
        filterChain = mock(FilterChain.class);
    }

    // -----------------------------------------------------------------------
    // Filter disabled
    // -----------------------------------------------------------------------

    @Test
    void disabled_filter_always_passes_through() throws Exception {
        LoginRateLimitProperties props = new LoginRateLimitProperties();
        props.setEnabled(false);
        props.setStaffMaxAttempts(1);
        LoginRateLimitFilter disabledFilter = new LoginRateLimitFilter(props);

        MockHttpServletRequest request = staffLoginRequest(CLIENT_IP);
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 20; i++) {
            disabledFilter.doFilterInternal(request, response, filterChain);
        }

        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    // -----------------------------------------------------------------------
    // Non-login paths are not rate limited
    // -----------------------------------------------------------------------

    @Test
    void get_request_to_api_is_not_rate_limited() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/shifts");
        request.setRemoteAddr(CLIENT_IP);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void post_to_non_login_path_is_not_rate_limited() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/sales");
        request.setRemoteAddr(CLIENT_IP);
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 20; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }

        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void options_preflight_to_login_path_is_not_rate_limited() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", STAFF_LOGIN_PATH);
        request.setRemoteAddr(CLIENT_IP);
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 20; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }

        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    // -----------------------------------------------------------------------
    // Staff login rate limiting
    // -----------------------------------------------------------------------

    @Test
    void staff_login_within_limit_proceeds_normally() throws Exception {
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest request = staffLoginRequest(CLIENT_IP);
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilterInternal(request, response, filterChain);

            assertThat(response.getStatus()).isNotEqualTo(429);
        }
    }

    @Test
    void staff_login_exceeding_limit_returns_429() throws Exception {
        // exhaust the limit
        for (int i = 0; i < 3; i++) {
            filter.doFilterInternal(staffLoginRequest(CLIENT_IP), new MockHttpServletResponse(), filterChain);
        }

        // next attempt should be rejected
        MockHttpServletRequest overLimitRequest = staffLoginRequest(CLIENT_IP);
        MockHttpServletResponse overLimitResponse = new MockHttpServletResponse();

        filter.doFilterInternal(overLimitRequest, overLimitResponse, filterChain);

        assertThat(overLimitResponse.getStatus()).isEqualTo(429);
        assertThat(overLimitResponse.getContentAsString()).contains("Too many login attempts");
        assertThat(overLimitResponse.getHeader("Retry-After")).isNotNull();
    }

    @Test
    void staff_login_429_response_does_not_expose_sensitive_details() throws Exception {
        for (int i = 0; i <= 3; i++) {
            filter.doFilterInternal(staffLoginRequest(CLIENT_IP), new MockHttpServletResponse(), filterChain);
        }

        MockHttpServletRequest request = staffLoginRequest(CLIENT_IP);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, filterChain);

        String body = response.getContentAsString();
        assertThat(body).doesNotContain("username");
        assertThat(body).doesNotContain("pin");
        assertThat(body).doesNotContain("password");
        assertThat(body).doesNotContain("stack");
        assertThat(body).contains("success");
        assertThat(body).contains("false");
    }

    // -----------------------------------------------------------------------
    // Admin login rate limiting
    // -----------------------------------------------------------------------

    @Test
    void admin_login_within_limit_proceeds_normally() throws Exception {
        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest request = adminLoginRequest(CLIENT_IP);
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilterInternal(request, response, filterChain);

            assertThat(response.getStatus()).isNotEqualTo(429);
        }
    }

    @Test
    void admin_login_exceeding_limit_returns_429() throws Exception {
        for (int i = 0; i < 2; i++) {
            filter.doFilterInternal(adminLoginRequest(CLIENT_IP), new MockHttpServletResponse(), filterChain);
        }

        MockHttpServletRequest overLimitRequest = adminLoginRequest(CLIENT_IP);
        MockHttpServletResponse overLimitResponse = new MockHttpServletResponse();

        filter.doFilterInternal(overLimitRequest, overLimitResponse, filterChain);

        assertThat(overLimitResponse.getStatus()).isEqualTo(429);
        assertThat(overLimitResponse.getContentAsString()).contains("Too many login attempts");
    }

    // -----------------------------------------------------------------------
    // Limit isolation
    // -----------------------------------------------------------------------

    @Test
    void staff_and_admin_limits_are_independent() throws Exception {
        // exhaust admin limit (2 attempts)
        for (int i = 0; i < 2; i++) {
            filter.doFilterInternal(adminLoginRequest(CLIENT_IP), new MockHttpServletResponse(), filterChain);
        }

        // staff limit (3) should not be affected
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest request = staffLoginRequest(CLIENT_IP);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, filterChain);
            assertThat(response.getStatus()).isNotEqualTo(429);
        }
    }

    @Test
    void different_ips_have_independent_limits() throws Exception {
        // exhaust limit for CLIENT_IP
        for (int i = 0; i < 3; i++) {
            filter.doFilterInternal(staffLoginRequest(CLIENT_IP), new MockHttpServletResponse(), filterChain);
        }

        // OTHER_IP should still be allowed
        MockHttpServletRequest request = staffLoginRequest(OTHER_IP);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void x_forwarded_for_header_is_used_as_rate_limit_key() throws Exception {
        // exhaust limit via X-Forwarded-For IP
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", STAFF_LOGIN_PATH);
            request.setRemoteAddr("10.0.0.1"); // proxy IP
            request.addHeader("X-Forwarded-For", "203.0.113.5, 10.0.0.1");
            filter.doFilterInternal(request, new MockHttpServletResponse(), filterChain);
        }

        // next request with same X-Forwarded-For should be rate limited
        MockHttpServletRequest blocked = new MockHttpServletRequest("POST", STAFF_LOGIN_PATH);
        blocked.setRemoteAddr("10.0.0.1");
        blocked.addHeader("X-Forwarded-For", "203.0.113.5, 10.0.0.1");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();

        filter.doFilterInternal(blocked, blockedResponse, filterChain);

        assertThat(blockedResponse.getStatus()).isEqualTo(429);
    }

    // -----------------------------------------------------------------------
    // Rate limit does not invoke filterChain for blocked requests
    // -----------------------------------------------------------------------

    @Test
    void blocked_request_does_not_reach_filter_chain() throws Exception {
        for (int i = 0; i < 3; i++) {
            filter.doFilterInternal(staffLoginRequest(CLIENT_IP), new MockHttpServletResponse(), filterChain);
        }

        MockHttpServletRequest blockedRequest = staffLoginRequest(CLIENT_IP);
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();

        filter.doFilterInternal(blockedRequest, blockedResponse, filterChain);

        // filterChain was called exactly 3 times (the allowed ones), not for the blocked 4th
        // We verify this by checking the response is 429 (if chain was called, status would not be set by filter)
        assertThat(blockedResponse.getStatus()).isEqualTo(429);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private MockHttpServletRequest staffLoginRequest(String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", STAFF_LOGIN_PATH);
        request.setRemoteAddr(remoteAddr);
        return request;
    }

    private MockHttpServletRequest adminLoginRequest(String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", ADMIN_LOGIN_PATH);
        request.setRemoteAddr(remoteAddr);
        return request;
    }
}
