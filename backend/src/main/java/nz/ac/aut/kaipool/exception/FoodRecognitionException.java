package nz.ac.aut.kaipool.exception;

public class FoodRecognitionException extends RuntimeException {

    public FoodRecognitionException(String message) {
        super(message);
    }

    public FoodRecognitionException(String message, Throwable cause) {
        super(message, cause);
    }
}
