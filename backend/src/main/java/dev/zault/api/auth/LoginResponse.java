package dev.zault.api.auth;

import java.util.Set;

public record LoginResponse(
        String username,
        boolean emailVerified,
        Set<String> scopes) {
}
