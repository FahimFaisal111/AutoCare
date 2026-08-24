package com.autocare.repository;

import com.autocare.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Integer> {
    Optional<Vehicle> findByVin(String vin);
    boolean existsByVin(String vin);

    List<Vehicle> findAllByOwner_UserId(Integer ownerId);

    /**
     * Multi-tenant query: Find all vehicles owned by customers of a specific workshop.
     * Note: Resolves workshop_id transitively through User, adhering to 3NF.
     */
    @Query("SELECT v FROM Vehicle v JOIN v.owner u WHERE u.workshop.workshopId = :workshopId")
    List<Vehicle> findAllByWorkshopId(@Param("workshopId") Integer workshopId);

    @Query("SELECT COUNT(v) FROM Vehicle v JOIN v.owner u WHERE u.workshop.workshopId = :workshopId")
    long countByWorkshopId(@Param("workshopId") Integer workshopId);
}

