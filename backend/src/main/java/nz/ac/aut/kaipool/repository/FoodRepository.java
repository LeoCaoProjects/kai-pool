package nz.ac.aut.kaipool.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import nz.ac.aut.kaipool.domain.Food;
import nz.ac.aut.kaipool.domain.FoodAvailability;

public interface FoodRepository extends JpaRepository<Food, Long> {

    List<Food> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<Food> findByOwnerIdAndAvailabilityOrderByCreatedAtDesc(
            Long ownerId, FoodAvailability availability);
}
