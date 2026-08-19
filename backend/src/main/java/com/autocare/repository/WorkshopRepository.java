package com.autocare.repository;

import com.autocare.entity.Workshop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface WorkshopRepository extends JpaRepository<Workshop, Integer> {
    Optional<Workshop> findByAccessCode(String accessCode);
}
