package dev.zault.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collection;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String JWT_COOKIE_NAME = "zault_token";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        extractTokenFromCookie(request)
                .flatMap(jwtService::validateToken)
                .ifPresent(claims -> setAuthentication(claims, request));

        filterChain.doFilter(request, response);
    }

    private Optional<String> extractTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return Optional.empty();
        }
        for (Cookie cookie : request.getCookies()) {
            if (JWT_COOKIE_NAME.equals(cookie.getName())) {
                return Optional.ofNullable(cookie.getValue())
                        .filter(v -> !v.isBlank());
            }
        }
        return Optional.empty();
    }

    private void setAuthentication(Claims claims, HttpServletRequest request) {
        String username = claims.getSubject();
        Long userId = extractUserId(claims);
        Set<String> scopes = extractScopes(claims);

        if (username != null && userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            var principal = new AuthenticatedUserPrincipal(username, userId, scopes);
            var authorities = scopes.stream()
                    .map(scope -> new SimpleGrantedAuthority("SCOPE_" + scope))
                    .toList();
            var auth = new UsernamePasswordAuthenticationToken(
                    principal, null, authorities);
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
    }

    private Long extractUserId(Claims claims) {
        Object rawUserId = claims.get("uid");
        if (rawUserId instanceof Number number) {
            return number.longValue();
        }
        if (rawUserId instanceof String value && !value.isBlank()) {
            try {
                return Long.parseLong(value);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private Set<String> extractScopes(Claims claims) {
        Object rawScopes = claims.get("scp");
        if (rawScopes instanceof String scopeString) {
            return Arrays.stream(scopeString.split("\\s+"))
                    .map(String::trim)
                    .filter(scope -> !scope.isBlank())
                    .collect(Collectors.toSet());
        }
        if (rawScopes instanceof Collection<?> scopeCollection) {
            return scopeCollection.stream()
                    .map(String::valueOf)
                    .map(String::trim)
                    .filter(scope -> !scope.isBlank())
                    .collect(Collectors.toSet());
        }
        return Set.of();
    }
}

