package nz.ac.aut.kaipool.dto;

import jakarta.validation.constraints.Size;

public record MeetingArrangementRequest(
        @Size(max = 200) String meetingPlace,
        @Size(max = 120) String meetingTime,
        @Size(max = 1000) String meetingNote) {
}
