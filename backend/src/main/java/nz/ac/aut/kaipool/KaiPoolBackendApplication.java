package nz.ac.aut.kaipool;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class KaiPoolBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(KaiPoolBackendApplication.class, args);
    }
}
