package com.shiftcontrol.backend.shared.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RequestIdFilterTest {

    private final RequestIdFilter filter = new RequestIdFilter();

    // -------------------------------------------------------------------------
    // Test 1: generates a UUID when no incoming X-Request-Id header
    // -------------------------------------------------------------------------

    @Test
    void generates_request_id_when_header_is_absent() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);

        String requestId = response.getHeader(RequestIdFilter.REQUEST_ID_HEADER);
        assertThat(requestId).isNotBlank();
    }

    // -------------------------------------------------------------------------
    // Test 2: uses the incoming X-Request-Id when present
    // -------------------------------------------------------------------------

    @Test
    void uses_incoming_request_id_when_header_is_present() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(RequestIdFilter.REQUEST_ID_HEADER, "test-correlation-123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getHeader(RequestIdFilter.REQUEST_ID_HEADER))
                .isEqualTo("test-correlation-123");
    }

    // -------------------------------------------------------------------------
    // Test 3: MDC is cleared after the request completes
    // -------------------------------------------------------------------------

    @Test
    void clears_mdc_key_after_request_completes() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);

        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }

    // -------------------------------------------------------------------------
    // Test 4: always calls the filter chain
    // -------------------------------------------------------------------------

    @Test
    void calls_filter_chain() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    // -------------------------------------------------------------------------
    // Test 5: each request gets a unique ID when no header is supplied
    // -------------------------------------------------------------------------

    @Test
    void generates_unique_ids_for_separate_requests() throws Exception {
        MockHttpServletRequest request1 = new MockHttpServletRequest();
        MockHttpServletRequest request2 = new MockHttpServletRequest();
        MockHttpServletResponse response1 = new MockHttpServletResponse();
        MockHttpServletResponse response2 = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request1, response1, chain);
        filter.doFilterInternal(request2, response2, chain);

        assertThat(response1.getHeader(RequestIdFilter.REQUEST_ID_HEADER))
                .isNotEqualTo(response2.getHeader(RequestIdFilter.REQUEST_ID_HEADER));
    }
}
