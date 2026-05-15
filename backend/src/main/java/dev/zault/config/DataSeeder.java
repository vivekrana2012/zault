package dev.zault.config;

import dev.zault.model.User;
import dev.zault.repository.UserRepository;
import dev.zault.util.IdentityNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${zault.admin.username:admin}")
    private String adminUsername;

    @Value("${zault.admin.password:#{null}}")
    private String adminPassword;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            log.info("Users already exist, skipping seed.");
            return;
        }

        if (adminPassword == null || adminPassword.isBlank()) {
            log.warn("No ZAULT_ADMIN_PASSWORD set and no users exist. "
                    + "Set the environment variable and restart to create the admin user.");
            return;
        }

        if (adminPassword.length() < 12) {
            log.warn("ZAULT_ADMIN_PASSWORD is less than 12 characters. "
                    + "Use a stronger password for production.");
        }

        User admin = new User(
                UUID.randomUUID().toString(),
                IdentityNormalizer.normalizeUsername(adminUsername),
                passwordEncoder.encode(adminPassword),
                "admin@zault.local",
                "Admin");
        admin.setEmailVerified(true);
        userRepository.save(admin);
        log.info("Created initial admin user: {}", admin.getUsername());
    }
}

