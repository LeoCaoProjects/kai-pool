package nz.ac.aut.kaipool.service;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.config.JwtService;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.AuthResponse;
import nz.ac.aut.kaipool.dto.LoginRequest;
import nz.ac.aut.kaipool.dto.RegisterRequest;
import nz.ac.aut.kaipool.exception.EmailAlreadyRegisteredException;
import nz.ac.aut.kaipool.exception.InvalidCredentialsException;
import nz.ac.aut.kaipool.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            UserService userService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normaliseEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyRegisteredException();
        }

        User user = new User(request.name().trim(), email, passwordEncoder.encode(request.password()));
        User savedUser = userRepository.save(user);
        return new AuthResponse(jwtService.createToken(savedUser.getEmail()), userService.toResponse(savedUser));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normaliseEmail(request.email()))
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        return new AuthResponse(jwtService.createToken(user.getEmail()), userService.toResponse(user));
    }

    private String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
