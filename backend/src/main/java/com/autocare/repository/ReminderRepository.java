package com.autocare.repository;

import com.autocare.entity.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReminderRepository extends JpaRepository<Reminder, Integer> {

    @Query("SELECT r FROM Reminder r JOIN r.vehicle v WHERE v.owner.userId = :ownerId ORDER BY r.dueDate ASC")
    List<Reminder> findAllByOwnerId(@Param("ownerId") Integer ownerId);

    List<Reminder> findAllByVehicle_VehicleId(Integer vehicleId);
}
