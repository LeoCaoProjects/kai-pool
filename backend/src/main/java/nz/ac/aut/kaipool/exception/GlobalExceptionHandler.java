package nz.ac.aut.kaipool.exception;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import nz.ac.aut.kaipool.dto.ErrorResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ErrorResponse("Validation failed", fields));
    }

    @ExceptionHandler({InvalidCredentialsException.class})
    ResponseEntity<ErrorResponse> handleUnauthorized(RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(exception.getMessage()));
    }

    @ExceptionHandler({
            EmailAlreadyRegisteredException.class,
            ListingUnavailableException.class,
            ConnectionConflictException.class
    })
    ResponseEntity<ErrorResponse> handleConflict(RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(exception.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(exception.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(exception.getMessage()));
    }

    @ExceptionHandler({InvalidImageException.class, MissingServletRequestPartException.class,
            CurrentPasswordIncorrectException.class})
    ResponseEntity<ErrorResponse> handleInvalidImage(Exception exception) {
        String message = exception instanceof InvalidImageException
                ? exception.getMessage()
                : exception instanceof CurrentPasswordIncorrectException
                    ? exception.getMessage()
                : "Choose an image before analysing it.";
        return ResponseEntity.badRequest().body(new ErrorResponse(message));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ErrorResponse> handleImageTooLarge() {
        return ResponseEntity.badRequest().body(new ErrorResponse("The image must be 10 MB or smaller."));
    }

    @ExceptionHandler(FoodRecognitionException.class)
    ResponseEntity<ErrorResponse> handleRecognition(FoodRecognitionException exception) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ErrorResponse(exception.getMessage()));
    }

    @ExceptionHandler(PasswordResetException.class)
    ResponseEntity<ErrorResponse> handlePasswordReset(PasswordResetException exception) {
        return ResponseEntity.badRequest().body(new ErrorResponse(exception.getMessage()));
    }

    @ExceptionHandler(RecoveryEmailUnavailableException.class)
    ResponseEntity<ErrorResponse> handleRecoveryEmailUnavailable(RecoveryEmailUnavailableException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new ErrorResponse(exception.getMessage()));
    }
}
