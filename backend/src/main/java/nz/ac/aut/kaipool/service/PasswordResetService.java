package nz.ac.aut.kaipool.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.dto.ForgotPasswordRequest;
import nz.ac.aut.kaipool.dto.ResetPasswordRequest;
import nz.ac.aut.kaipool.exception.PasswordResetException;
import nz.ac.aut.kaipool.repository.UserRepository;

@Service
public class PasswordResetService {
    private final ConcurrentHashMap<String, ResetCode> codes = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final RecoveryEmailService emailService;

    public PasswordResetService(UserRepository users, PasswordEncoder encoder, RecoveryEmailService emailService) {
        this.users = users;
        this.encoder = encoder;
        this.emailService = emailService;
    }

    public void request(ForgotPasswordRequest request) {
        String email = normalize(request.email());
        var user = users.findByEmailIgnoreCase(email);
        if (user.isEmpty()) return;
        ResetCode existing = codes.get(email);
        if (existing != null && existing.createdAt().isAfter(Instant.now().minus(60, ChronoUnit.SECONDS))) {
            throw new PasswordResetException("Wait a minute before requesting another code");
        }
        String code = "%06d".formatted(random.nextInt(1_000_000));
        emailService.sendPasswordResetCode(email, code);
        codes.put(email, new ResetCode(encoder.encode(code), Instant.now(), Instant.now().plus(10, ChronoUnit.MINUTES), 0));
    }

    @Transactional
    public void reset(ResetPasswordRequest request) {
        String email = normalize(request.email());
        ResetCode stored = codes.get(email);
        if (stored == null || stored.expiresAt().isBefore(Instant.now()) || stored.attempts() >= 5) {
            codes.remove(email);
            throw new PasswordResetException("That code is invalid or has expired");
        }
        if (!encoder.matches(request.code(), stored.hash())) {
            codes.put(email, new ResetCode(stored.hash(), stored.createdAt(), stored.expiresAt(), stored.attempts() + 1));
            throw new PasswordResetException("That code is invalid or has expired");
        }
        var user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new PasswordResetException("That code is invalid or has expired"));
        user.setPasswordHash(encoder.encode(request.newPassword()));
        users.save(user);
        codes.remove(email);
    }

    private String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    private record ResetCode(String hash, Instant createdAt, Instant expiresAt, int attempts) {}
}
