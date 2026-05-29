package com.shiftcontrol.backend.integration;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for Spring Boot Actuator health endpoint and request ID filter.
 *
 * Verifies:
 * - /actuator/health is accessible without authentication.
 * - The response contains a status field.
 * - Other actuator endpoints are not accessible without authentication.
 * - X-Request-Id header is always returned in the response.
 * - A provided X-Request-Id is echoed back in the response.
 */
class ActuatorHealthIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Health endpoint accessibility
    // -------------------------------------------------------------------------

    @Test
    void actuator_health_is_accessible_without_authentication() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    void actuator_health_response_contains_status_field() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").exists());
    }

    // -------------------------------------------------------------------------
    // Unexposed actuator endpoints must not be accessible
    // -------------------------------------------------------------------------

    @Test
    void actuator_env_is_not_accessible_without_authentication() throws Exception {
        // /actuator/env is not exposed (only health is in management.endpoints.web.exposure.include).
        // Spring Security denyAll() returns 401 for unauthenticated requests before the handler
        // could respond with 404.
        mockMvc.perform(get("/actuator/env"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void actuator_beans_is_not_accessible_without_authentication() throws Exception {
        mockMvc.perform(get("/actuator/beans"))
                .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // Request ID header (RequestIdFilter)
    // -------------------------------------------------------------------------

    @Test
    void response_contains_request_id_header() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(header().exists("X-Request-Id"));
    }

    @Test
    void provided_request_id_is_echoed_in_response() throws Exception {
        mockMvc.perform(get("/actuator/health")
                        .header("X-Request-Id", "integration-test-id-abc"))
                .andExpect(header().string("X-Request-Id", "integration-test-id-abc"));
    }
}
