package nz.ac.aut.kaipool.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import nz.ac.aut.kaipool.exception.RecoveryEmailUnavailableException;

@Service
public class RecoveryEmailService {
    private final String apiKey;
    private final String from;
    private final RestClient client = RestClient.create("https://api.resend.com");

    public RecoveryEmailService(
            @Value("${app.email.resend.api-key:}") String apiKey,
            @Value("${app.email.from:}") String from) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.from = from == null ? "" : from.trim();
    }

    public void sendPasswordResetCode(String email, String code) {
        if (apiKey.isBlank() || from.isBlank()) throw new RecoveryEmailUnavailableException();
        try {
            client.post().uri("/emails")
                    .header("Authorization", "Bearer " + apiKey)
                    .body(Map.of(
                            "from", from,
                            "to", email,
                            "subject", "Your Kai Pool password reset code",
                            "text", "Your Kai Pool code is " + code
                                    + ". It expires in 10 minutes. If you did not request this, ignore this email."))
                    .retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            throw new RecoveryEmailUnavailableException();
        }
    }
}
