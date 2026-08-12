package nz.ac.aut.kaipool.service;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nz.ac.aut.kaipool.domain.CookingConnection;
import nz.ac.aut.kaipool.domain.CookingConnectionStatus;
import nz.ac.aut.kaipool.domain.User;
import nz.ac.aut.kaipool.dto.ConnectionResponseRequest;
import nz.ac.aut.kaipool.dto.CookingConnectionResponse;
import nz.ac.aut.kaipool.dto.MeetingArrangementRequest;
import nz.ac.aut.kaipool.exception.ConnectionConflictException;
import nz.ac.aut.kaipool.exception.ForbiddenException;
import nz.ac.aut.kaipool.exception.ResourceNotFoundException;
import nz.ac.aut.kaipool.repository.CookingConnectionRepository;

@Service
public class CookingConnectionService {

    private final CookingConnectionRepository connectionRepository;
    private final MatchingService matchingService;
    private final UserService userService;

    public CookingConnectionService(
            CookingConnectionRepository connectionRepository,
            MatchingService matchingService,
            UserService userService) {
        this.connectionRepository = connectionRepository;
        this.matchingService = matchingService;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<CookingConnectionResponse> getConnections(String email) {
        User viewer = userService.getRequiredByEmail(email);
        return connectionRepository.findAllForUser(viewer.getId()).stream()
                .map(connection -> toResponse(connection, viewer))
                .toList();
    }

    @Transactional(readOnly = true)
    public CookingConnectionResponse getConnection(String email, Long id) {
        User viewer = userService.getRequiredByEmail(email);
        return toResponse(getParticipantConnection(id, viewer), viewer);
    }

    @Transactional
    public synchronized CookingConnectionResponse requestConnection(String email, Long recipientId) {
        User requester = userService.getRequiredByEmail(email);
        if (requester.getId().equals(recipientId)) {
            throw new ConnectionConflictException("You cannot send a cooking request to yourself");
        }
        User recipient = matchingService.getRequiredEligibleUser(email, recipientId);
        CookingConnection connection = connectionRepository.findBetween(requester.getId(), recipientId)
                .orElseGet(() -> new CookingConnection(requester, recipient));
        if (connection.getId() != null && connection.getStatus() != CookingConnectionStatus.DECLINED) {
            throw new ConnectionConflictException(connection.getStatus() == CookingConnectionStatus.ACCEPTED
                    ? "You are already connected"
                    : "A cooking request already exists between you");
        }
        connection.setRequester(requester);
        connection.setRecipient(recipient);
        connection.setStatus(CookingConnectionStatus.PENDING);
        connection.setRespondedAt(null);
        connection.setMeetingPlace(null);
        connection.setMeetingTime(null);
        connection.setMeetingNote(null);
        connection.setUpdatedAt(Instant.now());
        return toResponse(connectionRepository.save(connection), requester);
    }

    @Transactional
    public CookingConnectionResponse respond(String email, Long id, ConnectionResponseRequest request) {
        User viewer = userService.getRequiredByEmail(email);
        CookingConnection connection = getParticipantConnection(id, viewer);
        if (!connection.getRecipient().getId().equals(viewer.getId())) {
            throw new ForbiddenException("Only the recipient can respond to this cooking request");
        }
        // Mobile clients may retry when the connection drops after the database
        // commit but before the response reaches the phone. Repeating the same
        // decision is safe and should return the already-updated connection.
        if (connection.getStatus() == request.status()
                && (request.status() == CookingConnectionStatus.ACCEPTED
                        || request.status() == CookingConnectionStatus.DECLINED)) {
            return toResponse(connection, viewer);
        }
        if (connection.getStatus() != CookingConnectionStatus.PENDING) {
            throw new ConnectionConflictException("This cooking request has already been answered");
        }
        if (request.status() != CookingConnectionStatus.ACCEPTED
                && request.status() != CookingConnectionStatus.DECLINED) {
            throw new ConnectionConflictException("Choose ACCEPTED or DECLINED");
        }
        connection.setStatus(request.status());
        connection.setRespondedAt(Instant.now());
        connection.setUpdatedAt(connection.getRespondedAt());
        return toResponse(connectionRepository.save(connection), viewer);
    }

    @Transactional
    public CookingConnectionResponse updateArrangement(String email, Long id, MeetingArrangementRequest request) {
        User viewer = userService.getRequiredByEmail(email);
        CookingConnection connection = getParticipantConnection(id, viewer);
        if (connection.getStatus() != CookingConnectionStatus.ACCEPTED) {
            throw new ConnectionConflictException("Accept the cooking request before arranging a meeting");
        }
        connection.setMeetingPlace(clean(request.meetingPlace()));
        connection.setMeetingTime(clean(request.meetingTime()));
        connection.setMeetingNote(clean(request.meetingNote()));
        connection.setUpdatedAt(Instant.now());
        return toResponse(connectionRepository.save(connection), viewer);
    }

    private CookingConnection getParticipantConnection(Long id, User viewer) {
        CookingConnection connection = connectionRepository.findDetailedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cooking connection not found"));
        if (!connection.getRequester().getId().equals(viewer.getId())
                && !connection.getRecipient().getId().equals(viewer.getId())) {
            throw new ForbiddenException("You are not part of this cooking connection");
        }
        return connection;
    }

    private CookingConnectionResponse toResponse(CookingConnection connection, User viewer) {
        boolean incoming = connection.getRecipient().getId().equals(viewer.getId());
        User other = incoming ? connection.getRequester() : connection.getRecipient();
        boolean accepted = connection.getStatus() == CookingConnectionStatus.ACCEPTED;
        return new CookingConnectionResponse(
                connection.getId(),
                connection.getStatus(),
                incoming,
                other.getId(),
                other.getName(),
                other.getBio(),
                other.getProfileImageUrl(),
                new LinkedHashSet<>(other.getFoodCultures()),
                accepted ? other.getEmail() : null,
                accepted ? connection.getMeetingPlace() : null,
                accepted ? connection.getMeetingTime() : null,
                accepted ? connection.getMeetingNote() : null,
                connection.getCreatedAt(),
                connection.getRespondedAt(),
                connection.getUpdatedAt());
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
