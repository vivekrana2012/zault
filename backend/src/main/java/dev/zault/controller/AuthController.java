package dev.zault.controller;

import dev.zault.api.ErrorResponse;
import dev.zault.api.auth.LoginResponse;
import dev.zault.api.auth.LogoutResponse;
import dev.zault.api.auth.MeResponse;
import dev.zault.api.auth.RegisterResponse;
import dev.zault.db.UserDatabaseService;
import dev.zault.model.User;
import dev.zault.repository.UserRepository;
import dev.zault.security.AuthenticatedUserPrincipal;
import dev.zault.security.JwtAuthenticationFilter;
import dev.zault.security.JwtService;
import dev.zault.util.IdentityNormalizer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Locale;
import java.sql.ResultSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-z0-9_]+$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final String DUMMY_PASSWORD_SEED = "zault-dummy-password-seed";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserDatabaseService userDatabaseService;
    private final String dummyPasswordHash;
    private final MeterRegistry meterRegistry;

    // registration counters
    private final Counter registerSuccess;
    private final Counter registerFailValidation;
    private final Counter registerFailUsernameTaken;
    private final Counter registerFailEmailTaken;
    private final Counter registerFailConflict;

    // login counters
    private final Counter loginSuccess;
    private final Counter loginFailValidation;
    private final Counter loginFailUnknownUser;
    private final Counter loginFailWrongPassword;
    private final Counter loginFailLocked;

    // logout counter
    private final Counter logoutTotal;

    @Value("${zault.security.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${zault.security.lockout-minutes:15}")
    private long lockoutMinutes;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          UserDatabaseService userDatabaseService,
                          MeterRegistry meterRegistry) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userDatabaseService = userDatabaseService;
        this.meterRegistry = meterRegistry;
        this.dummyPasswordHash = passwordEncoder.encode(DUMMY_PASSWORD_SEED);

        // registration counters
        this.registerSuccess        = authCounter("registration", "success", "created");
        this.registerFailValidation = authCounter("registration", "failure", "validation_error");
        this.registerFailUsernameTaken = authCounter("registration", "failure", "username_taken");
        this.registerFailEmailTaken = authCounter("registration", "failure", "email_taken");
        this.registerFailConflict   = authCounter("registration", "failure", "conflict");

        // login counters
        this.loginSuccess          = authCounter("login", "success", "ok");
        this.loginFailValidation   = authCounter("login", "failure", "validation_error");
        this.loginFailUnknownUser  = authCounter("login", "failure", "unknown_user");
        this.loginFailWrongPassword = authCounter("login", "failure", "wrong_password");
        this.loginFailLocked       = authCounter("login", "failure", "account_locked");

        // logout counter
        this.logoutTotal = Counter.builder("zault.auth.logout")
                .description("Total logout calls")
                .register(meterRegistry);
    }

    /** Helper to build a named auth counter with result + reason tags. */
    private Counter authCounter(String event, String result, String reason) {
        return Counter.builder("zault.auth." + event)
                .description("Auth " + event + " events")
                .tag("result", result)
                .tag("reason", reason)
                .register(meterRegistry);
    }

    public record LoginRequest(String username, String password) {}
    public record RegisterRequest(String username, String email, String displayName, String password) {}

    @Operation(summary = "Register a new user")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User registered",
                    content = @Content(schema = @Schema(implementation = RegisterResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Conflict",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        // Validate required fields
        if (request.username() == null || request.username().isBlank()
                || request.email() == null || request.email().isBlank()
                || request.password() == null || request.password().isBlank()) {
            registerFailValidation.increment();
            log.warn("auth.register result=failure reason=validation_error detail=missing_required_fields");
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Username, email, and password are required"));
        }

        String username = IdentityNormalizer.normalizeUsername(request.username());
        String email = IdentityNormalizer.normalizeEmail(request.email());

        // Validate username format
        if (username.length() < 3 || username.length() > 50
                || !USERNAME_PATTERN.matcher(username).matches()) {
            registerFailValidation.increment();
            log.warn("auth.register result=failure reason=validation_error detail=invalid_username username={}", username);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Username must be 3-50 characters, alphanumeric and underscores only"));
        }

        // Validate email format
        if (!EMAIL_PATTERN.matcher(email).matches() || email.length() > 255) {
            registerFailValidation.increment();
            log.warn("auth.register result=failure reason=validation_error detail=invalid_email username={}", username);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid email format"));
        }

        // Validate password length
        if (request.password().length() < 8 || request.password().length() > 72) {
            registerFailValidation.increment();
            log.warn("auth.register result=failure reason=validation_error detail=invalid_password_length username={}", username);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Password must be 8-72 characters"));
        }

        // Validate display name length
        if (request.displayName() != null && request.displayName().trim().length() > 100) {
            registerFailValidation.increment();
            log.warn("auth.register result=failure reason=validation_error detail=display_name_too_long username={}", username);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Display name must be at most 100 characters"));
        }

        String displayName = (request.displayName() != null && !request.displayName().isBlank())
                ? request.displayName().trim() : null;

        User user = new User(UUID.randomUUID().toString(), username, passwordEncoder.encode(request.password()), email, displayName);
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            String conflictMsg = resolveRegistrationConflictMessage(e);
            if (conflictMsg.contains("Username")) {
                registerFailUsernameTaken.increment();
                log.warn("auth.register result=failure reason=username_taken username={}", username);
            } else if (conflictMsg.contains("Email")) {
                registerFailEmailTaken.increment();
                log.warn("auth.register result=failure reason=email_taken username={}", username);
            } else {
                registerFailConflict.increment();
                log.warn("auth.register result=failure reason=conflict username={}", username);
            }
            return ResponseEntity.status(409)
                    .body(Map.of("error", conflictMsg));
        }
        userDatabaseService.ensureUserDatabase(user.getId());

        registerSuccess.increment();
        log.info("auth.register result=success username={} userId={}", user.getUsername(), user.getId());
        return ResponseEntity.status(201)
                .body(Map.of(
                        "username", user.getUsername(),
                        "emailVerified", false,
                        "userId", user.getId()));
    }

    @Operation(summary = "Authenticate user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated",
                    content = @Content(schema = @Schema(implementation = LoginResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid credentials",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "423", description = "Account locked",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody LoginRequest request,
            HttpServletResponse response) {

        // Validate input
        if (request.username() == null || request.username().isBlank()
                || request.password() == null || request.password().isBlank()) {
            loginFailValidation.increment();
            log.warn("auth.login result=failure reason=validation_error detail=missing_credentials");
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Username and password are required"));
        }

        // Constant-time-ish lookup: always hash even if user not found (prevent timing attacks)
        var userOpt = userRepository.findByUsername(IdentityNormalizer.normalizeUsername(request.username()));

        if (userOpt.isEmpty()) {
            // Run bcrypt verification even for unknown users to reduce timing differences.
            passwordEncoder.matches(request.password(), dummyPasswordHash);
            loginFailUnknownUser.increment();
            log.warn("auth.login result=failure reason=unknown_user");
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid credentials"));
        }

        User user = userOpt.get();

        // Check account lockout
        if (user.isLockedOut()) {
            loginFailLocked.increment();
            log.warn("auth.login result=failure reason=account_locked userId={} username={}", user.getId(), user.getUsername());
            return ResponseEntity.status(423)
                    .body(Map.of("error", "Account is temporarily locked. Try again later."));
        }

        // Verify password
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            user.recordFailedAttempt(maxFailedAttempts, lockoutMinutes);
            userRepository.save(user);
            loginFailWrongPassword.increment();
            log.warn("auth.login result=failure reason=wrong_password userId={} username={} failedAttempts={}",
                    user.getId(), user.getUsername(), user.getFailedAttempts());
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid credentials"));
        }

        // Success — reset failed attempts and issue token
        user.resetFailedAttempts();
        userRepository.save(user);

        String token = jwtService.generateToken(user.getUsername(), user.getId());
        addJwtCookie(response, token);

        loginSuccess.increment();
        log.info("auth.login result=success userId={} username={}", user.getId(), user.getUsername());
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "emailVerified", user.isEmailVerified(),
                "scopes", jwtService.getDefaultUserScopes()));
    }

    @Operation(summary = "Logout current user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Logged out",
                    content = @Content(schema = @Schema(implementation = LogoutResponse.class)))
    })
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        clearJwtCookie(response);
        logoutTotal.increment();
        log.info("auth.logout result=success");
        return ResponseEntity.ok(Map.of("status", "logged_out"));
    }

    @Operation(summary = "Get current authenticated user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Current user",
                    content = @Content(schema = @Schema(implementation = MeResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Principal principal, Authentication authentication) {
        if (principal == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Not authenticated"));
        }
        var userOpt = userRepository.findByUsername(IdentityNormalizer.normalizeUsername(principal.getName()));
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "User not found"));
        }
        User user = userOpt.get();
        var result = new java.util.HashMap<String, Object>();
        result.put("username", user.getUsername());
        result.put("email", user.getEmail());
        result.put("displayName", user.getDisplayName());
        result.put("emailVerified", user.isEmailVerified());
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal authUser) {
            result.put("userId", authUser.userId());
            result.put("scopes", authUser.scopes());
            result.put("userDbPath", userDatabaseService.getUserDatabasePath(authUser.userId()).toString());
            String createdAt = userDatabaseService.withCurrentUserDatabase("db:read", connection -> {
                try (var statement = connection.prepareStatement(
                        "SELECT value FROM user_db_meta WHERE key = ?")) {
                    statement.setString(1, "created_at");
                    try (ResultSet rs = statement.executeQuery()) {
                        return rs.next() ? rs.getString(1) : null;
                    }
                }
            });
            result.put("userDbCreatedAt", createdAt);
        } else {
            result.put("scopes", List.of());
        }
        return ResponseEntity.ok(result);
    }

    private void addJwtCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(JwtAuthenticationFilter.JWT_COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) jwtService.getTokenExpiry().toSeconds());
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    private void clearJwtCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(JwtAuthenticationFilter.JWT_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    private String resolveRegistrationConflictMessage(DataIntegrityViolationException e) {
        String message = e.getMostSpecificCause().getMessage();
        if (message == null) {
            return "Username or email is already registered";
        }
        String lowerMessage = message.toLowerCase(Locale.ROOT);
        if (lowerMessage.contains("users.username")) {
            return "Username is already taken";
        }
        if (lowerMessage.contains("users.email")) {
            return "Email is already registered";
        }
        return "Username or email is already registered";
    }
}


