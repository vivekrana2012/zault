package dev.zault.api.auth;

public record RegisterResponse(
        String username,
        boolean emailVerified,
        String userId) {
}
