package dev.zault.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.Parameter;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Set;

@Configuration
public class OpenApiConfig {

    private static final Set<String> EXEMPT_PATHS = Set.of(
            "/api/auth/login",
            "/api/auth/register"
    );

    @Bean
    public OpenAPI zaultOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Zault API")
                        .version("0.0.1")
                        .description("""
                                Zault investment dashboard backend API.

                                **API versioning:** All endpoints under `/api/**` except \
                                `/api/auth/login`, `/api/auth/register`, and `/api/health*` \
                                require the `X-API-Version: 1` request header. \
                                Missing or unsupported values return `400` with a structured error body.
                                """));
    }

    @Bean
    public OpenApiCustomizer apiVersionHeaderCustomizer() {
        return openApi -> {
            if (openApi.getPaths() == null) {
                return;
            }

            Parameter versionHeader = new Parameter()
                    .in("header")
                    .name(ApiVersionFilter.VERSION_HEADER)
                    .required(true)
                    .description("API version — must be `1`")
                    .schema(new StringSchema()
                            ._enum(List.of("1"))
                            ._default("1"));

            openApi.getPaths().forEach((path, pathItem) -> {
                if (!requiresVersionHeader(path)) {
                    return;
                }
                pathItem.readOperations().forEach(operation -> addHeaderIfAbsent(operation, versionHeader));
            });
        };
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

    private void addHeaderIfAbsent(Operation operation, Parameter header) {
        if (operation == null) {
            return;
        }
        boolean alreadyPresent = operation.getParameters() != null &&
                operation.getParameters().stream()
                        .anyMatch(p -> "header".equals(p.getIn())
                                && ApiVersionFilter.VERSION_HEADER.equals(p.getName()));
        if (!alreadyPresent) {
            operation.addParametersItem(header);
        }
    }
}
