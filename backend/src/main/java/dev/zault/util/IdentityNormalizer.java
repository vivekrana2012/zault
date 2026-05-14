package dev.zault.util;

import java.util.Locale;

public final class IdentityNormalizer {

    private IdentityNormalizer() {
    }

    public static String normalizeUsername(String username) {
        return username == null ? null : username.trim().toLowerCase(Locale.ROOT);
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}

