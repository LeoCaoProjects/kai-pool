package nz.ac.aut.kaipool.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import nz.ac.aut.kaipool.domain.CollaborativeRecipeCacheEntry;

public interface CollaborativeRecipeCacheRepository
        extends JpaRepository<CollaborativeRecipeCacheEntry, String> {
}
