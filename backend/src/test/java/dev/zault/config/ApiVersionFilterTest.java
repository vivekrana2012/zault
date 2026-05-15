package dev.zault.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiVersionFilterTest {

    private final ApiVersionFilter filter = new ApiVersionFilter();

    @Test
    void blocksMissingVersionHeaderOnProtectedApi() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/investments");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(400, response.getStatus());
        String body = response.getContentAsString();
        assertTrue(body.contains("missing_api_version"));
        assertTrue(body.contains("supportedVersions"));
    }

    @Test
    void allowsExemptPathWithoutVersionHeader() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/auth/login");
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNotNull(chain.getRequest());
        assertEquals(200, response.getStatus());
    }

    @Test
    void allowsSupportedVersionHeader() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/investments");
        request.addHeader(ApiVersionFilter.VERSION_HEADER, "1");
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNotNull(chain.getRequest());
        assertEquals(200, response.getStatus());
    }

    @Test
    void blocksUnsupportedVersionHeader() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/investments");
        request.addHeader(ApiVersionFilter.VERSION_HEADER, "2");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(400, response.getStatus());
        String body = response.getContentAsString();
        assertTrue(body.contains("unsupported_api_version"));
        assertTrue(body.contains("\"receivedVersion\":\"2\""));
    }
}

