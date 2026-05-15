package dev.zault.security;

import dev.zault.model.User;
import dev.zault.repository.UserRepository;
import dev.zault.util.IdentityNormalizer;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ZaultUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public ZaultUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(@NonNull String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(IdentityNormalizer.normalizeUsername(username))
                .orElseThrow(() -> new UsernameNotFoundException("User not found - " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                List.of());
    }
}
