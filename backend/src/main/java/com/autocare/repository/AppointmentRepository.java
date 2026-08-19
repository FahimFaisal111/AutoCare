package com.autocare.repository;

import com.autocare.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {

    /**
     * Mathematical Overlap Range Check:
     * Counts how many non-cancelled appointments for this mechanic overlap with [startTime, endTime].
     * Condition: (existing.start < new.end) AND (existing.start + existing.duration > new.start)
     */
    @Query(value = """
        SELECT COUNT(*) FROM appointment a
        WHERE a.mechanic_id = :mechanicId
          AND a.status != 'CANCELLED'
          AND a.scheduled_start < :endTime
          AND DATE_ADD(a.scheduled_start, INTERVAL a.duration_minutes MINUTE) > :startTime
        """, nativeQuery = true)
    long countOverlappingAppointments(
        @Param("mechanicId") Integer mechanicId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    /**
     * Multi-tenant query: Find all appointments for a given workshop.
     */
    @Query("SELECT a FROM Appointment a JOIN a.mechanic m WHERE m.workshop.workshopId = :workshopId")
    List<Appointment> findAllByWorkshopId(@Param("workshopId") Integer workshopId);
}
