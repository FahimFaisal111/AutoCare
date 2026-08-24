package com.autocare.repository;

import com.autocare.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Integer> {

    Optional<Invoice> findByAppointment_AppointmentId(Integer appointmentId);

    @Query("SELECT i FROM Invoice i JOIN i.appointment a JOIN a.mechanic m WHERE m.workshop.workshopId = :workshopId")
    List<Invoice> findAllByWorkshopId(@Param("workshopId") Integer workshopId);

    @Query("SELECT COALESCE(SUM(i.totalAmount), 0) FROM Invoice i JOIN i.appointment a JOIN a.mechanic m WHERE m.workshop.workshopId = :workshopId")
    BigDecimal sumTotalRevenueByWorkshopId(@Param("workshopId") Integer workshopId);
}
