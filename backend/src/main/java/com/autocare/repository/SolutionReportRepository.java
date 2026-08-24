package com.autocare.repository;

import com.autocare.entity.SolutionReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SolutionReportRepository extends JpaRepository<SolutionReport, Integer> {
    Optional<SolutionReport> findByProblemReport_ReportId(Integer reportId);
}
