package nz.ac.aut.kaipool.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;

import nz.ac.aut.kaipool.domain.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @EntityGraph(attributePaths = { "foodCultures", "foodCulturesToExplore" })
    @Query("select distinct user from User user")
    List<User> findAllWithCultures();
}
