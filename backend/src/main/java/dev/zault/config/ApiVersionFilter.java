package dev.zault.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class ApiVersionFilter extends OncePerRequestFilter {

    public static final String VERSION_HEADER = "X-API-Version";
    private static final String SUPPORTED_VERSION = "1";
    private static final Set<String> EXEMPT_PATHS = Set.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/health"
    );

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!requiresVersionHeader(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String receivedVersion = request.getHeader(VERSION_HEADER);
        if (receivedVersion == null || receivedVersion.isBlank()) {
            writeVersionError(response, path, "missing_api_version", "Missing API version header", null);
            return;
        }

        String normalized = receivedVersion.trim();
        if (!SUPPORTED_VERSION.equals(normalized)) {
            writeVersionError(response, path, "unsupported_api_version", "Unsupported API version", normalized);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean requiresVersionHeader(String path) {
        if (path == null || !path.startsWith("/api/")) {
            return false;
        }
        if (path.startsWith("/api/health")) {
            return false;
        }
        return !EXEMPT_PATHS.contains(path);
    }

    private void writeVersionError(HttpServletResponse response,
                                   String path,
                                   String code,
                                   String message,
                                   String receivedVersion) throws IOException {
        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", message);
        body.put("code", code);
        body.put("supportedVersions", List.of(SUPPORTED_VERSION));
        body.put("receivedVersion", receivedVersion);
        body.put("path", path);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}



