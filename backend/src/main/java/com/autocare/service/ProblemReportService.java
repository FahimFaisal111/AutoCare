package com.autocare.service;

import com.autocare.dto.ProblemReportRequest;
import com.autocare.dto.ProblemReportResponse;
import com.autocare.dto.SolutionReportResponse;
import com.autocare.entity.*;
import com.autocare.exception.ForbiddenException;
import com.autocare.exception.ResourceNotFoundException;
import com.autocare.repository.ProblemReportRepository;
import com.autocare.repository.SolutionReportRepository;
import com.autocare.repository.UserRepository;
import com.autocare.repository.VehicleRepository;
import com.autocare.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProblemReportService {

    private final ProblemReportRepository problemReportRepository;
    private final SolutionReportRepository solutionReportRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    @Transactional
    public ProblemReportResponse createProblemReport(ProblemReportRequest request, UserPrincipal principal) {
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
            .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (!vehicle.getOwner().getUserId().equals(principal.getUserId())) {
            throw new ForbiddenException("You can only report issues for your own vehicles.");
        }

        User customer = userRepository.findById(principal.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        // 1. Create Problem Report
        ProblemReport report = ProblemReport.builder()
            .customer(customer)
            .vehicle(vehicle)
            .description(request.getDescription().trim())
            .status("OPEN")
            .build();

        ProblemReport savedReport = problemReportRepository.save(report);

        // 2. Synthesize AI Diagnostic Solution
        SolutionReport solution = generateDiagnosticSynthesis(savedReport, vehicle, request.getDescription());
        solutionReportRepository.save(solution);
        savedReport.setSolutionReport(solution);

        return mapToResponse(savedReport);
    }

    @Transactional(readOnly = true)
    public List<ProblemReportResponse> getProblemReports(UserPrincipal principal) {
        if (principal.getRole() == Role.CUSTOMER) {
            return problemReportRepository.findAllByCustomer_UserIdOrderByCreatedAtDesc(principal.getUserId()).stream()
                .map(this::mapToResponse)
                .toList();
        } else {
            return problemReportRepository.findAllByWorkshopId(principal.getWorkshopId()).stream()
                .map(this::mapToResponse)
                .toList();
        }
    }

    @Transactional(readOnly = true)
    public ProblemReportResponse getProblemReportById(Integer reportId, UserPrincipal principal) {
        ProblemReport report = problemReportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Problem report not found"));

        if (!report.getCustomer().getWorkshop().getWorkshopId().equals(principal.getWorkshopId())) {
            throw new ForbiddenException("Unauthorized access to report outside your workshop tenant.");
        }

        if (principal.getRole() == Role.CUSTOMER && !report.getCustomer().getUserId().equals(principal.getUserId())) {
            throw new ForbiddenException("Unauthorized access to report filed by another customer.");
        }

        return mapToResponse(report);
    }

    @Transactional
    public ProblemReportResponse reviewReportByMechanic(Integer reportId, UserPrincipal principal) {
        if (principal.getRole() != Role.MECHANIC && principal.getRole() != Role.ADMIN) {
            throw new ForbiddenException("Only certified mechanics or workshop managers can review diagnostic solutions.");
        }

        ProblemReport report = problemReportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Problem report not found"));

        User mechanic = userRepository.findById(principal.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("Mechanic not found"));

        SolutionReport solution = report.getSolutionReport();
        if (solution != null) {
            solution.setReviewedBy(mechanic);
            solutionReportRepository.save(solution);
        }

        return mapToResponse(report);
    }

    private SolutionReport generateDiagnosticSynthesis(ProblemReport report, Vehicle vehicle, String description) {
        String lowerDesc = description.toLowerCase();

        String probableCause;
        String recommendedAction;
        String urgency;
        BigDecimal confidence;
        List<String> keywords = new ArrayList<>();

        if (lowerDesc.contains("brake") || lowerDesc.contains("squeak") || lowerDesc.contains("grind") || lowerDesc.contains("stopping")) {
            probableCause = "Friction assembly degradation: Pad lining thickness below minimum safety spec or rotor glazing causing resonant friction.";
            recommendedAction = "Inspect front and rear brake pads, verify rotor runout and thickness, replace with OEM ceramic pads and bleed brake lines.";
            urgency = "MEDIUM";
            confidence = BigDecimal.valueOf(0.925).setScale(3, RoundingMode.HALF_UP);
            keywords.addAll(List.of("brake pads", "rotor friction", "wear indicator", "stopping distance"));
        } else if (lowerDesc.contains("engine") || lowerDesc.contains("misfire") || lowerDesc.contains("check engine") || lowerDesc.contains("shudder") || lowerDesc.contains("stall")) {
            probableCause = "Powertrain combustion instability: Potential ignition coil breakdown, fouled spark plug, or mass airflow sensor drift.";
            recommendedAction = "Run comprehensive OBD-II live diagnostic scan, perform cylinder misfire count test, inspect ignition coils and spark plug gap.";
            urgency = "HIGH";
            confidence = BigDecimal.valueOf(0.940).setScale(3, RoundingMode.HALF_UP);
            keywords.addAll(List.of("engine misfire", "check engine", "ignition coil", "spark plugs"));
        } else if (lowerDesc.contains("battery") || lowerDesc.contains("start") || lowerDesc.contains("crank") || lowerDesc.contains("alternator") || lowerDesc.contains("electric")) {
            probableCause = "Electrical starting & charging fault: 12V lead-acid battery terminal sulfation or degraded cold-cranking amps (CCA).";
            recommendedAction = "Perform load test on 12V battery, check alternator charging voltage (spec 13.8V-14.4V), clean terminal posts.";
            urgency = "MEDIUM";
            confidence = BigDecimal.valueOf(0.890).setScale(3, RoundingMode.HALF_UP);
            keywords.addAll(List.of("battery test", "alternator charging", "starter draw", "cca capacity"));
        } else if (lowerDesc.contains("ac") || lowerDesc.contains("air") || lowerDesc.contains("heat") || lowerDesc.contains("cold") || lowerDesc.contains("climate")) {
            probableCause = "HVAC thermal regulation fault: Low refrigerant charge due to service port micro-leak or blend door actuator failure.";
            recommendedAction = "Recover refrigerant, pressure test HVAC loop with nitrogen dye, replace Schrader seals and recharge to factory weight specification.";
            urgency = "LOW";
            confidence = BigDecimal.valueOf(0.865).setScale(3, RoundingMode.HALF_UP);
            keywords.addAll(List.of("hvac pressure", "refrigerant leak", "compressor clutch", "blend door"));
        } else if (lowerDesc.contains("tire") || lowerDesc.contains("vibration") || lowerDesc.contains("shake") || lowerDesc.contains("steering") || lowerDesc.contains("alignment")) {
            probableCause = "Chassis dynamics variance: Dynamic wheel imbalance, uneven tread feathering, or tie rod / ball joint play.";
            recommendedAction = "Perform 4-wheel computerized laser alignment check, dynamically balance all four tires, and inspect steering linkage torque.";
            urgency = "MEDIUM";
            confidence = BigDecimal.valueOf(0.910).setScale(3, RoundingMode.HALF_UP);
            keywords.addAll(List.of("wheel balance", "laser alignment", "tire wear", "steering tie-rod"));
        } else {
            probableCause = "General mechanical symptom detected: Subsystem requires physical inspection by a certified service technician.";
            recommendedAction = "Perform comprehensive multi-point vehicle diagnostic sweep, check OBD-II fault codes, and road test under matching load conditions.";
            urgency = "MEDIUM";
            confidence = BigDecimal.valueOf(0.815).setScale(3, RoundingMode.HALF_UP);
            keywords.addAll(List.of("diagnostic inspection", "obd scan", "physical road test"));
        }

        SolutionReport solution = SolutionReport.builder()
            .problemReport(report)
            .description("AI Diagnostic Synthesis for " + vehicle.getYear() + " " + vehicle.getMake() + " " + vehicle.getModel())
            .probableCause(probableCause)
            .recommendedAction(recommendedAction)
            .urgency(urgency)
            .confidenceScore(confidence)
            .build();

        for (String kw : keywords) {
            SolutionKeyword keywordEntity = SolutionKeyword.builder()
                .id(new SolutionKeywordId(null, kw))
                .solutionReport(solution)
                .build();
            solution.getKeywords().add(keywordEntity);
        }

        return solution;
    }

    private ProblemReportResponse mapToResponse(ProblemReport pr) {
        SolutionReportResponse solResp = null;
        if (pr.getSolutionReport() != null) {
            SolutionReport sr = pr.getSolutionReport();
            List<String> keywords = sr.getKeywords() != null
                ? sr.getKeywords().stream().map(k -> k.getId() != null ? k.getId().getSymptomKeyword() : "").filter(s -> !s.isEmpty()).toList()
                : List.of();

            String reviewerName = null;
            if (sr.getReviewedBy() != null) {
                reviewerName = sr.getReviewedBy().getFirstName() + " " + sr.getReviewedBy().getLastName();
            }

            solResp = SolutionReportResponse.builder()
                .solutionId(sr.getSolutionId())
                .description(sr.getDescription())
                .probableCause(sr.getProbableCause())
                .recommendedAction(sr.getRecommendedAction())
                .urgency(sr.getUrgency())
                .confidenceScore(sr.getConfidenceScore())
                .reviewedBy(sr.getReviewedBy() != null ? sr.getReviewedBy().getUserId() : null)
                .reviewerName(reviewerName)
                .keywords(keywords)
                .build();
        }

        return ProblemReportResponse.builder()
            .reportId(pr.getReportId())
            .customerId(pr.getCustomer().getUserId())
            .customerName(pr.getCustomer().getFirstName() + " " + pr.getCustomer().getLastName())
            .vehicleId(pr.getVehicle().getVehicleId())
            .vehicleInfo(pr.getVehicle().getYear() + " " + pr.getVehicle().getMake() + " " + pr.getVehicle().getModel() + " (" + pr.getVehicle().getVin() + ")")
            .description(pr.getDescription())
            .status(pr.getStatus())
            .createdAt(pr.getCreatedAt())
            .solution(solResp)
            .build();
    }
}
