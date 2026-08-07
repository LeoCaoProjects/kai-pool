package nz.ac.aut.kaipool.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import nz.ac.aut.kaipool.domain.MealImageAsset;

public interface MealImageAssetRepository extends JpaRepository<MealImageAsset, String> {
}
