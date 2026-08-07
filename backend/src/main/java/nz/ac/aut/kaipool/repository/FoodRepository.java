package nz.ac.aut.kaipool.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import nz.ac.aut.kaipool.domain.Food;

public interface FoodRepository extends JpaRepository<Food, Long> {

    List<Food> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
