package nz.ac.aut.kaipool.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import nz.ac.aut.kaipool.domain.MealPhotoCacheEntry;

public interface MealPhotoCacheRepository extends JpaRepository<MealPhotoCacheEntry, String> {
}
