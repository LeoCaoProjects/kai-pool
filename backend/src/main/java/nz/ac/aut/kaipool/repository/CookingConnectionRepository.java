package nz.ac.aut.kaipool.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import nz.ac.aut.kaipool.domain.CookingConnection;

public interface CookingConnectionRepository extends JpaRepository<CookingConnection, Long> {

    @EntityGraph(attributePaths = { "requester", "recipient" })
    @Query("""
            select connection from CookingConnection connection
            where connection.requester.id = :userId or connection.recipient.id = :userId
            order by connection.updatedAt desc
            """)
    List<CookingConnection> findAllForUser(@Param("userId") Long userId);

    @EntityGraph(attributePaths = { "requester", "recipient" })
    @Query("""
            select connection from CookingConnection connection
            where (connection.requester.id = :firstId and connection.recipient.id = :secondId)
               or (connection.requester.id = :secondId and connection.recipient.id = :firstId)
            """)
    Optional<CookingConnection> findBetween(@Param("firstId") Long firstId, @Param("secondId") Long secondId);

    @EntityGraph(attributePaths = { "requester", "recipient" })
    @Query("select connection from CookingConnection connection where connection.id = :id")
    Optional<CookingConnection> findDetailedById(@Param("id") Long id);
}
