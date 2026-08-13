package nz.ac.aut.kaipool.exception;

public class CurrentPasswordIncorrectException extends RuntimeException {
    public CurrentPasswordIncorrectException() {
        super("Current password is incorrect");
    }
}
