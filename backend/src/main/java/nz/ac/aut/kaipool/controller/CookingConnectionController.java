package nz.ac.aut.kaipool.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import nz.ac.aut.kaipool.dto.ConnectionResponseRequest;
import nz.ac.aut.kaipool.dto.CookingConnectionResponse;
import nz.ac.aut.kaipool.dto.MeetingArrangementRequest;
import nz.ac.aut.kaipool.service.CookingConnectionService;

@RestController
@RequestMapping("/api/cooking-connections")
public class CookingConnectionController {

    private final CookingConnectionService connectionService;

    public CookingConnectionController(CookingConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    @GetMapping
    public List<CookingConnectionResponse> getConnections(Principal principal) {
        return connectionService.getConnections(principal.getName());
    }

    @GetMapping("/{id}")
    public CookingConnectionResponse getConnection(Principal principal, @PathVariable Long id) {
        return connectionService.getConnection(principal.getName(), id);
    }

    @PostMapping("/requests/{recipientId}")
    public CookingConnectionResponse requestConnection(Principal principal, @PathVariable Long recipientId) {
        return connectionService.requestConnection(principal.getName(), recipientId);
    }

    @PutMapping("/{id}/response")
    public CookingConnectionResponse respond(
            Principal principal,
            @PathVariable Long id,
            @Valid @RequestBody ConnectionResponseRequest request) {
        return connectionService.respond(principal.getName(), id, request);
    }

    @PutMapping("/{id}/arrangement")
    public CookingConnectionResponse updateArrangement(
            Principal principal,
            @PathVariable Long id,
            @Valid @RequestBody MeetingArrangementRequest request) {
        return connectionService.updateArrangement(principal.getName(), id, request);
    }
}
