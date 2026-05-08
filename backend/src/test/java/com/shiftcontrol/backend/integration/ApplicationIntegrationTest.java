package com.shiftcontrol.backend.integration;

import org.junit.jupiter.api.Test;

class ApplicationIntegrationTest extends IntegrationTestBase {

    @Test
    void context_loads_with_testcontainers_postgres() {
        // If the Spring context starts, PostgreSQL Testcontainer,
        // Flyway migrations, JPA mappings, and SecurityConfig are valid.
    }
}