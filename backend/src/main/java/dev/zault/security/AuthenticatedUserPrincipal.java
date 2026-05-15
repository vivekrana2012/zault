package dev.zault.security;

import java.security.Principal;
import java.util.Set;

public record AuthenticatedUserPrincipal(
        String username,
        String userId,
        Set<String> scopes) implements Principal {

    @Override
    public String getName() {
        return username;
    }

    public boolean hasScope(String scope) {
        return scopes != null && scopes.contains(scope);
    }
}

