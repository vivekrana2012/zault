package dev.zault.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class JwtService {

    private static final List<String> DEFAULT_USER_SCOPES = List.of("db:read", "db:write");

    private final SecretKey signingKey;
    private final Duration tokenExpiry;

    public JwtService(
            @Value("${zault.jwt.secret}") String secret,
            @Value("${zault.jwt.expiry:PT1H}") Duration expiry) {
        if (secret.length() < 32) {
            throw new IllegalArgumentException("JWT secret must be at least 32 characters");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.tokenExpiry = expiry;
    }

    public String generateToken(String username, Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(username)
                .claim("uid", userId)
                .claim("scp", String.join(" ", DEFAULT_USER_SCOPES))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(tokenExpiry)))
                .signWith(signingKey)
                .compact();
    }

    public List<String> getDefaultUserScopes() {
        return DEFAULT_USER_SCOPES;
    }

    public Optional<Claims> validateToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public Duration getTokenExpiry() {
        return tokenExpiry;
    }
}

