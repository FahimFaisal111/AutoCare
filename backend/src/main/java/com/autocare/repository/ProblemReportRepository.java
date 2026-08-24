package com.autocare.repository;

import com.autocare.entity.ProblemReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProblemReportRepository extends JpaRepository<ProblemReport, Integer> {

    List<ProblemReport> findAllByCustomer_UserIdOrderByCreatedAtDesc(Integer customerId);

    @Query("SELECT pr FROM ProblemReport pr JOIN pr.customer c WHERE c.workshop.workshopId = :workshopId ORDER BY pr.createdAt DESC")
    List<ProblemReport> findAllByWorkshopId(@Param("workshopId") Integer workshopId);

    @Query("SELECT pr FROM ProblemReport pr JOIN pr.customer c WHERE c.workshop.workshopId = :workshopId AND pr.status = :status ORDER BY pr.createdAt DESC")
    List<ProblemReport> findAllByWorkshopIdAndStatus(@Param("workshopId") Integer workshopId, @Param("status") String status);
}
