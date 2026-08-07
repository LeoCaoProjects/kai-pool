package nz.ac.aut.kaipool.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "cooking_connections")
public class CookingConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CookingConnectionStatus status = CookingConnectionStatus.PENDING;

    @Column(length = 200)
    private String meetingPlace;

    @Column(length = 120)
    private String meetingTime;

    @Column(length = 1000)
    private String meetingNote;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant respondedAt;
    private Instant updatedAt;

    protected CookingConnection() {
    }

    public CookingConnection(User requester, User recipient) {
        this.requester = requester;
        this.recipient = recipient;
    }

    @PrePersist
    void setTimestamps() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
    }

    public Long getId() { return id; }
    public User getRequester() { return requester; }
    public void setRequester(User requester) { this.requester = requester; }
    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }
    public CookingConnectionStatus getStatus() { return status; }
    public void setStatus(CookingConnectionStatus status) { this.status = status; }
    public String getMeetingPlace() { return meetingPlace; }
    public void setMeetingPlace(String meetingPlace) { this.meetingPlace = meetingPlace; }
    public String getMeetingTime() { return meetingTime; }
    public void setMeetingTime(String meetingTime) { this.meetingTime = meetingTime; }
    public String getMeetingNote() { return meetingNote; }
    public void setMeetingNote(String meetingNote) { this.meetingNote = meetingNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getRespondedAt() { return respondedAt; }
    public void setRespondedAt(Instant respondedAt) { this.respondedAt = respondedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
