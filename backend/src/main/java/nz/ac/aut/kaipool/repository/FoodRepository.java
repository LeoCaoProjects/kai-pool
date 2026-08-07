package nz.ac.aut.kaipool.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.FoodAvailability;

public interface FoodRepository extends JpaRepository<Food, Long> {

    List<Food> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<Food> findByOwnerIdAndAvailabilityOrderByCreatedAtDesc(
            Long ownerId, FoodAvailability availability);

    List<Food> findByAvailabilityOrderByCreatedAtDesc(FoodAvailability availability);

    @Query("""
            select f from Food f join fetch f.owner
            where f.availability = nz.ac.aut.kaipool.domain.FoodAvailability.GIVEAWAY
              and f.claimedBy is null
              and f.owner.latitude is not null and f.owner.longitude is not null
            order by f.createdAt desc
            """)
    List<Food> findMarketplaceFoodsWithOwnerLocation();

    @Query("select f from Food f join fetch f.owner where f.claimedBy.id = :userId order by f.claimedAt desc")
    List<Food> findClaimedListings(@Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from Food f join fetch f.owner where f.id = :id")
    Optional<Food> findByIdForClaim(@Param("id") Long id);
}
