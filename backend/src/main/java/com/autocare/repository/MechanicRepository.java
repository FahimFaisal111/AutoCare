package com.autocare.repository;

import com.autocare.entity.Mechanic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MechanicRepository extends JpaRepository<Mechanic, Integer> {
    boolean existsByEmployeeCode(String employeeCode);
    Optional<Mechanic> findByEmployeeCode(String employeeCode);
}
