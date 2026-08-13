package nz.ac.aut.kaipool.exception;

public class RecoveryEmailUnavailableException extends RuntimeException {
    public RecoveryEmailUnavailableException() {
        super("Password recovery email is not configured on this server");
    }
}
