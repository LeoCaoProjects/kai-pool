package nz.ac.aut.kaipool.dto;

import java.util.Map;

public record ErrorResponse(String message, Map<String, String> fields) {

    public ErrorResponse(String message) {
        this(message, Map.of());
    }
}
