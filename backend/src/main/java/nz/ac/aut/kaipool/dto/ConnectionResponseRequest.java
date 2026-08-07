package nz.ac.aut.kaipool.dto;

import jakarta.validation.constraints.NotNull;
import nz.ac.aut.kaipool.domain.CookingConnectionStatus;

public record ConnectionResponseRequest(@NotNull CookingConnectionStatus status) {
}
