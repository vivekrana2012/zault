package dev.zault.api.auth;

import java.util.Set;

public record MeResponse(
        String username,
        String email,
        String displayName,
        boolean emailVerified,
        String userId,
        Set<String> scopes,
        String userDbPath,
        String userDbCreatedAt) {
}
