package com.autocare.repository;

import com.autocare.entity.Mechanic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MechanicRepository extends JpaRepository<Mechanic, Integer> {
    boolean existsByEmployeeCode(String employeeCode);
    Optional<Mechanic> findByEmployeeCode(String employeeCode);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM Mechanic m WHERE m.workshop.workshopId = :workshopId")
    java.util.List<Mechanic> findAllByWorkshopId(@org.springframework.data.repository.query.Param("workshopId") Integer workshopId);
}

