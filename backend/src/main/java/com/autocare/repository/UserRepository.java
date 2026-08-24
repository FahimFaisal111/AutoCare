package com.autocare.repository;

import com.autocare.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    /**
     * Finds a user by email, eagerly fetching the workshop to prevent N+1 query overhead.
     */
    @EntityGraph(attributePaths = {"workshop"})
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Multi-tenant query: Finds all users belonging to a specific tenant workshop.
     */
    @Query("SELECT u FROM User u WHERE u.workshop.workshopId = :workshopId")
    List<User> findAllByWorkshopId(@Param("workshopId") Integer workshopId);

    @Query("SELECT u FROM User u WHERE u.workshop.workshopId = :workshopId AND u.role = :role")
    List<User> findAllByWorkshopIdAndRole(@Param("workshopId") Integer workshopId, @Param("role") com.autocare.entity.Role role);

    @Query("SELECT COUNT(u) FROM User u WHERE u.workshop.workshopId = :workshopId AND u.role = :role")
    long countByWorkshopIdAndRole(@Param("workshopId") Integer workshopId, @Param("role") com.autocare.entity.Role role);
}

