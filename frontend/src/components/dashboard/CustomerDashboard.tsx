"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  Vehicle,
  ProblemReport,
  Appointment,
  Reminder,
  UserProfile,
  ApiError,
} from "@/lib/api";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import {
  Car,
  Plus,
  Wrench,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BrainCircuit,
  Loader2,
  Sparkles,
  ShieldCheck,
  FileText,
  UserCheck,
  Activity,
  X,
  Zap,
} from "lucide-react";

/**
 * Rule-based Vehicle Health Score.
 */
function computeVehicleHealth(
  vehicleId: number,
  reports: ProblemReport[],
  appointments: Appointment[],
  reminders: Reminder[]
) {
  let score = 100;
  const breakdown: string[] = [];

  const openReports = reports.filter((r) => r.vehicleId === vehicleId && r.status === "OPEN");
  if (openReports.length > 0) {
    let penalty = 0;
    openReports.forEach((r) => {
      const urgency = r.solution?.urgency;
      penalty += urgency === "HIGH" ? 25 : urgency === "MEDIUM" ? 15 : urgency === "LOW" ? 8 : 10;
    });
    score -= penalty;
    const hasHigh = openReports.some((r) => r.solution?.urgency === "HIGH");
    breakdown.push(
      `-${penalty} pts — ${openReports.length} open issue${openReports.length > 1 ? "s" : ""}${hasHigh ? " (includes HIGH urgency)" : ""}`
    );
  } else {
    breakdown.push("+0 pts — no open problem reports");
  }

  const activeReminders = reminders.filter((rem) => rem.vehicleId === vehicleId && rem.status === "ACTIVE");
  if (activeReminders.length > 0) {
    const penalty = activeReminders.length * 5;
    score -= penalty;
    breakdown.push(`-${penalty} pts — ${activeReminders.length} active maintenance alert${activeReminders.length > 1 ? "s" : ""}`);
  } else {
    breakdown.push("+0 pts — no active reminders");
  }

  const completedLogs = appointments
    .filter((a) => a.vehicleId === vehicleId && a.status === "COMPLETED")
    .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());

  if (completedLogs.length === 0) {
    score -= 10;
    breakdown.push("-10 pts — no completed service on record yet");
  } else {
    const monthsSince = (Date.now() - new Date(completedLogs[0].scheduledStart).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSince > 12) {
      score -= 15;
      breakdown.push("-15 pts — last service was over 12 months ago");
    } else if (monthsSince > 6) {
      score -= 5;
      breakdown.push("-5 pts — last service was over 6 months ago");
    } else {
      breakdown.push("+0 pts — serviced within the last 6 months");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: string, textClass: string, barClass: string, chipClass: string;
  if (score >= 85) {
    label = "Optimal Condition";
    textClass = "text-emerald-600";
    barClass = "bg-emerald-500";
    chipClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (score >= 65) {
    label = "Good Health";
    textClass = "text-[#635bff]";
    barClass = "bg-[#635bff]";
    chipClass = "bg-blue-50 text-[#635bff] border-blue-200";
  } else if (score >= 45) {
    label = "Fair Health";
    textClass = "text-amber-600";
    barClass = "bg-amber-500";
    chipClass = "bg-amber-50 text-amber-700 border-amber-200";
  } else {
    label = "Attention Required";
    textClass = "text-red-600";
    barClass = "bg-red-500";
    chipClass = "bg-red-50 text-red-700 border-red-200";
  }

  return { score, label, textClass, barClass, chipClass, breakdown };
}

export function CustomerDashboard() {
  const { user } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [mechanics, setMechanics] = useState<UserProfile[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"garage" | "diagnostics" | "appointments">("garage");

  // Modals / Forms
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [healthVehicle, setHealthVehicle] = useState<Vehicle | null>(null);

  // Form states
  const [vehicleForm, setVehicleForm] = useState({
    vin: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    odometer: 0,
  });

  const [reportForm, setReportForm] = useState({
    vehicleId: 0,
    description: "",
  });

  const [bookForm, setBookForm] = useState({
    vehicleId: 0,
    mechanicId: 0,
    reportId: undefined as number | undefined,
    scheduledStart: "",
    durationMinutes: 60,
    serviceDescription: "",
  });

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [vList, rList, aList, remList, mList] = await Promise.all([
        api.getVehicles(),
        api.getProblemReports(),
        api.getAppointments(),
        api.getReminders(),
        api.getWorkshopMechanics().catch(() => []),
      ]);
      setVehicles(vList);
      setReports(rList);
      setAppointments(aList);
      setReminders(remList);
      setMechanics(mList);

      if (vList.length > 0) {
        setReportForm((prev) => ({ ...prev, vehicleId: vList[0].vehicleId }));
        setBookForm((prev) => ({ ...prev, vehicleId: vList[0].vehicleId }));
      }
      if (mList.length > 0) {
        setBookForm((prev) => ({ ...prev, mechanicId: mList[0].userId }));
      }
    } catch (err) {
      console.error("Failed to load customer data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      await api.registerVehicle({
        ...vehicleForm,
        year: Number(vehicleForm.year),
        odometer: Number(vehicleForm.odometer),
      });
      setActionSuccess("Vehicle registered successfully into your garage!");
      setShowAddVehicleModal(false);
      setVehicleForm({
        vin: "",
        make: "",
        model: "",
        year: new Date().getFullYear(),
        odometer: 0,
      });
      await loadData();
    } catch (err: unknown) {
      const error = err as ApiError;
      setActionError(error.message || "Failed to register vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      await api.createProblemReport({
        vehicleId: Number(reportForm.vehicleId),
        description: reportForm.description,
      });
      setActionSuccess("Issue analyzed by AutoCare AI! Diagnostic synthesis generated.");
      setShowReportModal(false);
      setReportForm((prev) => ({ ...prev, description: "" }));
      await loadData();
      setActiveTab("diagnostics");
    } catch (err: unknown) {
      const error = err as ApiError;
      setActionError(error.message || "Failed to submit problem report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      await api.createAppointment({
        vehicleId: Number(bookForm.vehicleId),
        mechanicId: Number(bookForm.mechanicId),
        reportId: bookForm.reportId ? Number(bookForm.reportId) : undefined,
        scheduledStart: bookForm.scheduledStart,
        durationMinutes: Number(bookForm.durationMinutes),
        serviceDescription: bookForm.serviceDescription,
      });
      setActionSuccess("Service appointment booked conflict-free!");
      setShowBookModal(false);
      await loadData();
      setActiveTab("appointments");
    } catch (err: unknown) {
      const error = err as ApiError;
      setActionError(error.message || "Scheduling conflict detected. Please select another slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#635bff]" />
        <span className="text-sm text-gray-500 font-semibold">Opening customer garage workspace...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-6 text-[#0a2540]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20">
              Customer Garage
            </span>
            <span className="text-xs text-gray-400 font-mono">Workshop: {user?.workshopName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a2540]">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Monitor vehicle health telemetry, run instant AI diagnostic checks, and schedule repairs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActionError("");
              setActionSuccess("");
              setShowAddVehicleModal(true);
            }}
            className="px-4 py-2.5 bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(99,91,255,0.3)] active:translate-y-0 active:scale-[0.98] transition-all duration-[300ms] ease-out flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
          <button
            disabled={vehicles.length === 0}
            onClick={() => {
              setActionError("");
              setActionSuccess("");
              setShowReportModal(true);
            }}
            className="px-4 py-2.5 bg-white border border-gray-200 text-[#0a2540] hover:bg-gray-50 font-semibold text-xs sm:text-sm rounded-lg shadow-sm hover:-translate-y-0.5 hover:shadow transition-all duration-[300ms] ease-out flex items-center gap-1.5 disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4 text-[#635bff]" />
            <span>AI Diagnostic</span>
          </button>
        </div>
      </div>

      {actionSuccess && <AlertMessage type="success" message={actionSuccess} />}
      {actionError && <AlertMessage type="error" message={actionError} />}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() => setActiveTab("garage")}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-[300ms] ease-out flex items-center gap-2 ${
            activeTab === "garage"
              ? "bg-[#635bff] text-white shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5"
              : "bg-white border border-gray-200 text-[#0a2540] hover:bg-gray-50 hover:-translate-y-0.5 shadow-sm"
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>My Garage ({vehicles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-[300ms] ease-out flex items-center gap-2 ${
            activeTab === "diagnostics"
              ? "bg-[#635bff] text-white shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5"
              : "bg-white border border-gray-200 text-[#0a2540] hover:bg-gray-50 hover:-translate-y-0.5 shadow-sm"
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>AI Diagnostics ({reports.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("appointments")}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-[300ms] ease-out flex items-center gap-2 ${
            activeTab === "appointments"
              ? "bg-[#635bff] text-white shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5"
              : "bg-white border border-gray-200 text-[#0a2540] hover:bg-gray-50 hover:-translate-y-0.5 shadow-sm"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Appointments & Reminders ({appointments.length + reminders.length})</span>
        </button>
      </div>

      {/* Tab 1: Garage */}
      {activeTab === "garage" && (
        <div className="space-y-4">
          {vehicles.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white border border-gray-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#635bff]/10 text-[#635bff] flex items-center justify-center mx-auto">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0a2540]">No Vehicles in Garage</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                Add your vehicle VIN to begin tracking health telemetry, maintenance alerts, and booking services.
              </p>
              <button
                onClick={() => setShowAddVehicleModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your Vehicle</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => (
                <div
                  key={v.vehicleId}
                  className="p-6 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#635bff]/10 text-[#635bff]">
                        {v.year}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">ID #{v.vehicleId}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0a2540]">
                      {v.make} {v.model}
                    </h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-gray-500">
                        <span>VIN:</span>
                        <span className="font-mono text-[#0a2540] font-bold">{v.vin}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Odometer:</span>
                        <span className="text-[#0a2540] font-bold">{v.odometer.toLocaleString()} mi</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <button
                      onClick={() => setHealthVehicle(v)}
                      className="w-full py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-[300ms] ease-out hover:-translate-y-0.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Health Telemetry Score</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setReportForm({ vehicleId: v.vehicleId, description: "" });
                          setShowReportModal(true);
                        }}
                        className="flex-1 py-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-[#0a2540] text-xs font-semibold flex items-center justify-center gap-1 transition-all duration-[300ms] ease-out shadow-sm hover:-translate-y-0.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#635bff]" />
                        <span>Diagnose</span>
                      </button>
                      <button
                        onClick={() => {
                          setBookForm((prev) => ({ ...prev, vehicleId: v.vehicleId }));
                          setShowBookModal(true);
                        }}
                        className="flex-1 py-2 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Book Bay</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: AI Diagnostics */}
      {activeTab === "diagnostics" && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white border border-gray-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#635bff]/10 text-[#635bff] flex items-center justify-center mx-auto">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0a2540]">No Diagnostic Cases Filed</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                Describe symptoms like brake noises or engine misfires to trigger instant AI diagnostic analysis.
              </p>
              <button
                disabled={vehicles.length === 0}
                onClick={() => setShowReportModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Diagnostic Sweep</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => (
                <div
                  key={r.reportId}
                  className="p-6 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-400 font-mono">Report #{r.reportId}</span>
                      <h4 className="text-base font-bold text-[#0a2540]">{r.vehicleInfo}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full border font-bold ${
                          r.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.solution && (
                        <span
                          className={`text-xs px-3 py-1 rounded-full border font-bold ${
                            r.solution.urgency === "HIGH"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : r.solution.urgency === "MEDIUM"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          Urgency: {r.solution.urgency}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-700 space-y-1">
                    <span className="font-bold text-gray-400 uppercase tracking-wider block text-[10px]">Reported Symptoms</span>
                    <p className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-[#0a2540] leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  {r.solution && (
                    <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#635bff] text-xs font-bold">
                          <BrainCircuit className="w-4 h-4" />
                          <span>AI Diagnostic Hypothesis</span>
                        </div>
                        <span className="text-xs font-mono text-[#635bff] bg-white border border-blue-200 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                          Confidence: {Math.round(r.solution.confidenceScore * 100)}%
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="font-semibold text-gray-600 block">Probable Root Cause:</span>
                          <p className="text-[#0a2540] font-medium mt-0.5">{r.solution.probableCause}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600 block">Recommended Action:</span>
                          <p className="text-[#0a2540] font-medium mt-0.5">{r.solution.recommendedAction}</p>
                        </div>
                      </div>

                      {r.solution.keywords && r.solution.keywords.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            Keywords:
                          </span>
                          {r.solution.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-mono shadow-sm"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {r.solution.reviewerName && (
                        <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-bold border-t border-blue-200">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span>Verified by Staff: {r.solution.reviewerName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Appointments & Reminders */}
      {activeTab === "appointments" && (
        <div className="space-y-6">
          {/* Predictive Alerts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-[#0a2540]">Predictive Maintenance Alerts</h3>
            </div>

            {reminders.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm text-xs text-gray-500">
                No active maintenance alerts for your vehicles.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reminders.map((rem) => (
                  <div
                    key={rem.reminderId}
                    className="p-4 rounded-xl bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 flex items-start gap-3.5"
                  >
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0a2540]">{rem.reminderType}</span>
                        <span className="text-[11px] text-gray-400 font-mono font-semibold">Due: {rem.dueDate}</span>
                      </div>
                      <span className="text-gray-500 block">{rem.vehicleInfo}</span>
                      <p className="text-gray-600 text-[11px] leading-relaxed">{rem.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Service Appointments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#635bff]" />
                <h3 className="text-sm font-bold text-[#0a2540]">Service Appointments</h3>
              </div>
              <button
                disabled={vehicles.length === 0}
                onClick={() => setShowBookModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out"
              >
                + Book Service
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="p-10 text-center rounded-xl bg-white border border-gray-200 shadow-sm text-xs text-gray-500">
                No scheduled service appointments.
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((a) => (
                  <div
                    key={a.appointmentId}
                    className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0a2540]">{a.vehicleInfo}</span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                            a.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : a.status === "IN_PROGRESS"
                              ? "bg-blue-50 text-[#635bff] border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <div className="text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Technician: <strong className="text-[#0a2540]">{a.mechanicName}</strong></span>
                        <span>Date: <strong className="text-[#0a2540]">{new Date(a.scheduledStart).toLocaleString()}</strong></span>
                        <span>Duration: <strong className="text-[#0a2540]">{a.durationMinutes} min</strong></span>
                      </div>
                      {a.serviceDescription && (
                        <p className="text-gray-600 text-[11px] mt-0.5">{a.serviceDescription}</p>
                      )}
                    </div>

                    {a.status === "COMPLETED" && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-right space-y-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Invoiced</span>
                        <span className="text-base font-bold text-emerald-600 font-mono">
                          ${a.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Add Vehicle */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-[#0a2540] font-bold text-base">
                <Car className="w-5 h-5 text-[#635bff]" />
                <span>Register Vehicle into Garage</span>
              </div>
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <FormInput
                label="17-Digit Vehicle VIN"
                name="vin"
                id="veh-vin"
                placeholder="e.g. 1HGCR2F83HA123456"
                required
                maxLength={17}
                value={vehicleForm.vin}
                onChange={(e) => setVehicleForm((p) => ({ ...p, vin: e.target.value.toUpperCase() }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Make"
                  name="make"
                  id="veh-make"
                  placeholder="e.g. Toyota"
                  required
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, make: e.target.value }))}
                />
                <FormInput
                  label="Model"
                  name="model"
                  id="veh-model"
                  placeholder="e.g. Camry"
                  required
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, model: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Model Year"
                  name="year"
                  id="veh-year"
                  type="number"
                  required
                  value={vehicleForm.year.toString()}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, year: Number(e.target.value) }))}
                />
                <FormInput
                  label="Current Odometer (Miles)"
                  name="odometer"
                  id="veh-odometer"
                  type="number"
                  required
                  value={vehicleForm.odometer.toString()}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, odometer: Number(e.target.value) }))}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save Vehicle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Report Symptom / AI Diagnostic */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-[#0a2540] font-bold text-base">
                <BrainCircuit className="w-5 h-5 text-[#635bff]" />
                <span>Submit Vehicle Symptoms</span>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a2540] block">Select Vehicle</label>
                <select
                  value={reportForm.vehicleId}
                  onChange={(e) => setReportForm((p) => ({ ...p, vehicleId: Number(e.target.value) }))}
                  className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm font-medium"
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.year} {v.make} {v.model} ({v.vin})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a2540] block">Describe Symptoms</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Squeaking noise when applying brakes at low speeds, or intermittent rough engine idle on cold start."
                  value={reportForm.description}
                  onChange={(e) => setReportForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full p-3 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Generate Diagnosis</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Book Appointment */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-[#0a2540] font-bold text-base">
                <Calendar className="w-5 h-5 text-[#635bff]" />
                <span>Book Service Appointment</span>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a2540] block">Vehicle</label>
                <select
                  value={bookForm.vehicleId}
                  onChange={(e) => setBookForm((p) => ({ ...p, vehicleId: Number(e.target.value) }))}
                  className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm font-medium"
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.year} {v.make} {v.model} ({v.vin})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a2540] block">Certified Mechanic</label>
                <select
                  value={bookForm.mechanicId}
                  onChange={(e) => setBookForm((p) => ({ ...p, mechanicId: Number(e.target.value) }))}
                  className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm font-medium"
                >
                  {mechanics.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.firstName} {m.lastName} (Tech #{m.userId})
                    </option>
                  ))}
                </select>
              </div>

              <FormInput
                label="Scheduled Date & Time"
                type="datetime-local"
                name="scheduledStart"
                id="appt-start"
                required
                value={bookForm.scheduledStart}
                onChange={(e) => setBookForm((p) => ({ ...p, scheduledStart: e.target.value }))}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a2540] block">Duration (Minutes)</label>
                <select
                  value={bookForm.durationMinutes}
                  onChange={(e) => setBookForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                  className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm font-medium"
                >
                  <option value={30}>30 Minutes (Quick Inspection)</option>
                  <option value={60}>60 Minutes (Standard Service)</option>
                  <option value={90}>90 Minutes (Brake / Tire Service)</option>
                  <option value={120}>120 Minutes (Major Repair)</option>
                </select>
              </div>

              <FormInput
                label="Service Notes / Request Description"
                name="serviceDescription"
                id="appt-desc"
                placeholder="e.g. Synthetic oil change and brake rotor inspection"
                value={bookForm.serviceDescription}
                onChange={(e) => setBookForm((p) => ({ ...p, serviceDescription: e.target.value }))}
              />

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Confirm Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Vehicle Health Dashboard */}
      {healthVehicle && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-5 border border-gray-100 text-[#0a2540]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Vehicle Health Telemetry</span>
              </div>
              <button
                onClick={() => setHealthVehicle(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
              <h3 className="text-base font-bold text-[#0a2540]">
                {healthVehicle.year} {healthVehicle.make} {healthVehicle.model}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>VIN:</span>
                  <span className="font-mono text-[#0a2540] font-bold">{healthVehicle.vin}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Odometer:</span>
                  <span className="text-[#0a2540] font-bold">{healthVehicle.odometer.toLocaleString()} mi</span>
                </div>
              </div>
            </div>

            {(() => {
              const health = computeVehicleHealth(healthVehicle.vehicleId, reports, appointments, reminders);
              return (
                <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className={`w-5 h-5 ${health.textClass}`} />
                      <h4 className="text-sm font-bold text-[#0a2540]">Condition Index</h4>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full border font-bold ${health.chipClass}`}>
                      {health.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-bold font-mono ${health.textClass}`}>{health.score}%</span>
                    <div className="flex-1 h-3 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${health.barClass} transition-all duration-500`}
                        style={{ width: `${health.score}%` }}
                      />
                    </div>
                  </div>

                  <ul className="space-y-1 pt-2 border-t border-gray-100">
                    {health.breakdown.map((line, i) => (
                      <li key={i} className="text-xs text-gray-500 font-mono">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
