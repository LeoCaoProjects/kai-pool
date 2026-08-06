package nz.ac.aut.kaipool.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Restrict these origins to the deployed frontend before production use.
        registry.addMapping("/api/**")
                .allowedOriginPatterns(
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                        "http://10.*:*",
                        "http://172.16.*:*",
                        "http://172.17.*:*",
                        "http://172.18.*:*",
                        "http://172.19.*:*",
                        "http://172.2*.*:*",
                        "http://172.30.*:*",
                        "http://172.31.*:*",
                        "http://192.168.*:*")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
