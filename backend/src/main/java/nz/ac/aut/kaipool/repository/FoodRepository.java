package nz.ac.aut.kaipool.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import nz.ac.aut.kaipool.domain.Food;

public interface FoodRepository extends JpaRepository<Food, Long> {

    List<Food> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    @Query("""
            select f from Food f join fetch f.owner
            where f.owner.latitude is not null and f.owner.longitude is not null
            order by f.createdAt desc
            """)
    List<Food> findMarketplaceFoodsWithOwnerLocation();
}
