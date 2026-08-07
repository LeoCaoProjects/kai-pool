package nz.ac.aut.kaipool.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import nz.ac.aut.kaipool.domain.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);
}
