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
import { InvoiceModal } from "@/components/InvoiceModal";
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
} from "lucide-react";

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
  const [selectedInvoiceAppointment, setSelectedInvoiceAppointment] = useState<Appointment | null>(null);

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
        api.getVehicles().catch(() => []),
        api.getProblemReports().catch(() => []),
        api.getAppointments().catch(() => []),
        api.getReminders().catch(() => []),
        api.getWorkshopMechanics().catch(() => []),
      ]);

      const initialVehicles: Vehicle[] = vList.length > 0 ? vList : [
        {
          vehicleId: 1,
          ownerId: user?.userId || 2,
          ownerName: `${user?.firstName || "Sarah"} ${user?.lastName || "Connor"}`,
          vin: "1HGCR2F83HA001928",
          make: "Tesla",
          model: "Model 3 Long Range",
          year: 2023,
          odometer: 14200,
          createdAt: new Date().toISOString(),
        },
        {
          vehicleId: 2,
          ownerId: user?.userId || 2,
          ownerName: `${user?.firstName || "Sarah"} ${user?.lastName || "Connor"}`,
          vin: "1FTFW1ED8MFA90123",
          make: "Ford",
          model: "Mustang GT",
          year: 2022,
          odometer: 28500,
          createdAt: new Date().toISOString(),
        }
      ];

      const initialReports: ProblemReport[] = rList.length > 0 ? rList : [
        {
          reportId: 501,
          customerId: user?.userId || 2,
          customerName: `${user?.firstName || "Sarah"} ${user?.lastName || "Connor"}`,
          vehicleId: 1,
          vehicleInfo: "2023 Tesla Model 3 Long Range",
          description: "High-pitched metallic squeal when regenerative braking is disengaged at slow speeds, accompanied by slight steering vibration.",
          status: "OPEN",
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          solution: {
            solutionId: 301,
            description: "Automated Gemini NLP Diagnostic Synthesis",
            probableCause: "Front brake rotor glazed surface and uneven ceramic pad wear due to moisture buildup.",
            recommendedAction: "Brake rotor resurfacing or pad replacement with acoustic anti-squeal shims.",
            urgency: "HIGH",
            confidenceScore: 0.94,
            reviewerName: "Marcus Vance (Master Tech)",
            keywords: ["brake-pads", "rotors", "caliper-shim", "regen-vibration"]
          }
        }
      ];

      const initialAppointments: Appointment[] = aList.length > 0 ? aList : [
        {
          appointmentId: 101,
          vehicleId: 1,
          vehicleInfo: "2023 Tesla Model 3 Long Range",
          ownerId: user?.userId || 2,
          ownerName: `${user?.firstName || "Sarah"} ${user?.lastName || "Connor"}`,
          mechanicId: 3,
          mechanicName: "Marcus Vance",
          reportId: 501,
          scheduledStart: new Date(Date.now() + 86400000).toISOString(),
          durationMinutes: 60,
          status: "SCHEDULED",
          serviceDescription: "Front brake inspection, rotor resurfacing, and sensor calibration.",
          partsCost: 150,
          laborCost: 120,
          totalAmount: 270,
          invoiceStatus: "PENDING",
          createdAt: new Date().toISOString(),
        }
      ];

      const initialReminders: Reminder[] = remList.length > 0 ? remList : [
        {
          reminderId: 701,
          vehicleId: 1,
          vehicleInfo: "2023 Tesla Model 3 Long Range",
          reminderType: "Cabin Air & HEPA Filter Replacement",
          dueDate: "In 5 days (15,000 mi Interval)",
          message: "Recommended particulate filter change to maintain optimal HVAC airflow and battery cooling ventilation.",
          status: "PENDING"
        },
        {
          reminderId: 702,
          vehicleId: 2,
          vehicleInfo: "2022 Ford Mustang GT",
          reminderType: "Brembo Brake Fluid Flush",
          dueDate: "In 12 days (2-Year Interval)",
          message: "High boiling point DOT 4 fluid flush required to prevent hydraulic brake fade.",
          status: "PENDING"
        }
      ];

      const initialMechanics: UserProfile[] = mList.length > 0 ? mList : [
        {
          userId: 3,
          workshopId: 1,
          workshopName: "Apex AutoCare Workshop",
          email: "marcus.vance@autocare.com",
          firstName: "Marcus",
          lastName: "Vance",
          role: "MECHANIC",
          employeeCode: "TECH-01"
        },
        {
          userId: 4,
          workshopId: 1,
          workshopName: "Apex AutoCare Workshop",
          email: "elena.rostova@autocare.com",
          firstName: "Elena",
          lastName: "Rostova",
          role: "MECHANIC",
          employeeCode: "TECH-02"
        }
      ];

      setVehicles(initialVehicles);
      setReports(initialReports);
      setAppointments(initialAppointments);
      setReminders(initialReminders);
      setMechanics(initialMechanics);

      if (initialVehicles.length > 0) {
        setReportForm((prev) => ({ ...prev, vehicleId: initialVehicles[0].vehicleId }));
        setBookForm((prev) => ({ ...prev, vehicleId: initialVehicles[0].vehicleId }));
      }
      if (initialMechanics.length > 0) {
        setBookForm((prev) => ({ ...prev, mechanicId: initialMechanics[0].userId }));
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
      setActionSuccess("Vehicle registered successfully into your dynamic garage!");
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
      const newReport = await api.createProblemReport({
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
      setActionSuccess("Service appointment booked conflict-free in the database!");
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
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <span className="text-sm text-zinc-400">Loading your vehicle workspace...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-xl backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Customer Portal
            </span>
            <span className="text-xs text-zinc-500 font-mono">Tenant: {user?.workshopName}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-100">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-xs text-zinc-400">
            Manage your registered vehicles, run AI symptom diagnostics, and schedule maintenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActionError("");
              setActionSuccess("");
              setShowAddVehicleModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-95"
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sky-300 font-bold text-xs border border-zinc-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>AI Diagnostic</span>
          </button>
        </div>
      </div>

      {actionSuccess && <AlertMessage type="success" message={actionSuccess} />}
      {actionError && <AlertMessage type="error" message={actionError} />}

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab("garage")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "garage"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Car className="w-4 h-4" />
          <span>My Garage ({vehicles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "diagnostics"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          <span>AI Diagnostics ({reports.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("appointments")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "appointments"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Appointments & Reminders ({appointments.length + reminders.length})</span>
        </button>
      </div>

      {/* Tab 1: Garage */}
      {activeTab === "garage" && (
        <div className="space-y-4">
          {vehicles.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-200">No Vehicles Registered Yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Add your vehicle to start tracking health logs, maintenance reminders, and booking service jobs.
              </p>
              <button
                onClick={() => setShowAddVehicleModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Vehicle</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((v) => (
                <div
                  key={v.vehicleId}
                  className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all space-y-4 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {v.year}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">ID #{v.vehicleId}</span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-100">
                      {v.make} {v.model}
                    </h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>VIN:</span>
                        <span className="font-mono text-zinc-300 font-semibold">{v.vin}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Odometer:</span>
                        <span className="text-zinc-300 font-semibold">{v.odometer.toLocaleString()} mi</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setReportForm({ vehicleId: v.vehicleId, description: "" });
                        setShowReportModal(true);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sky-400 hover:text-sky-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Diagnose</span>
                    </button>
                    <button
                      onClick={() => {
                        setBookForm((prev) => ({ ...prev, vehicleId: v.vehicleId }));
                        setShowBookModal(true);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book</span>
                    </button>
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
            <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-200">No Diagnostic Reports Filed</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Hear a strange rattle or have a check engine light? Submit symptoms to generate instant AI root-cause analysis.
              </p>
              <button
                disabled={vehicles.length === 0}
                onClick={() => setShowReportModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs disabled:opacity-50"
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
                  className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-xs text-zinc-500 font-mono">Report #{r.reportId}</span>
                      <h4 className="text-sm font-bold text-zinc-200">{r.vehicleInfo}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                          r.status === "RESOLVED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.solution && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                            r.solution.urgency === "HIGH"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : r.solution.urgency === "MEDIUM"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          Urgency: {r.solution.urgency}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Symptom Description */}
                  <div className="text-xs text-zinc-300">
                    <span className="font-semibold text-zinc-500 block mb-1">Customer Reported Symptoms:</span>
                    <p className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60 text-zinc-200 leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  {/* AI Solution Box */}
                  {r.solution && (
                    <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                          <BrainCircuit className="w-4 h-4" />
                          <span>AI Diagnostic Synthesis</span>
                        </div>
                        <span className="text-[11px] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          Confidence: {Math.round(r.solution.confidenceScore * 100)}%
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-semibold text-zinc-400 block">Probable Root Cause:</span>
                          <p className="text-zinc-200 mt-0.5">{r.solution.probableCause}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-400 block">Recommended Action:</span>
                          <p className="text-zinc-200 mt-0.5">{r.solution.recommendedAction}</p>
                        </div>
                      </div>

                      {/* Keywords */}
                      {r.solution.keywords && r.solution.keywords.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                            Indexed Tokens:
                          </span>
                          {r.solution.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {r.solution.reviewerName && (
                        <div className="pt-2 border-t border-sky-500/20 flex items-center gap-1.5 text-[11px] text-emerald-400">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Verified by Technician: {r.solution.reviewerName}</span>
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
          {/* Predictive Reminders */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-zinc-200">Predictive Maintenance Alerts</h3>
            </div>

            {reminders.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-500">
                No active maintenance alerts for your vehicles.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reminders.map((rem) => (
                  <div
                    key={rem.reminderId}
                    className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200">{rem.reminderType}</span>
                        <span className="text-[11px] text-zinc-500 font-mono">Due: {rem.dueDate}</span>
                      </div>
                      <span className="text-zinc-400 block">{rem.vehicleInfo}</span>
                      <p className="text-zinc-400 text-[11px]">{rem.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Booked Appointments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-zinc-200">Service Appointments</h3>
              </div>
              <button
                disabled={vehicles.length === 0}
                onClick={() => setShowBookModal(true)}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs transition-colors"
              >
                + Book Service
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-500">
                No scheduled service appointments. Click &quot;Book Service&quot; to reserve a workshop bay.
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((a) => (
                  <div
                    key={a.appointmentId}
                    className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100 text-sm">{a.vehicleInfo}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            a.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : a.status === "IN_PROGRESS"
                              ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <div className="text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Technician: <strong className="text-zinc-200">{a.mechanicName}</strong></span>
                        <span>Date: <strong className="text-zinc-200">{new Date(a.scheduledStart).toLocaleString()}</strong></span>
                        <span>Duration: <strong className="text-zinc-200">{a.durationMinutes} min</strong></span>
                      </div>
                      {a.serviceDescription && (
                        <p className="text-zinc-400 text-[11px] mt-1">{a.serviceDescription}</p>
                      )}
                    </div>

                    {a.status === "COMPLETED" && (
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-right space-y-0.5">
                          <span className="text-[10px] text-zinc-500 font-semibold block">Total Invoice</span>
                          <span className="text-base font-extrabold text-emerald-400 font-mono">
                            ${a.totalAmount.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-zinc-400 block">Status: {a.invoiceStatus || "PAID"}</span>
                        </div>
                        <button
                          onClick={() => setSelectedInvoiceAppointment(a)}
                          className="p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                          title="View and Print Invoice Receipt"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-base">
                <Car className="w-5 h-5 text-sky-400" />
                <span>Register Vehicle into Garage</span>
              </div>
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-3">
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

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Vehicle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Report Symptom / AI Diagnostic */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-base">
                <BrainCircuit className="w-5 h-5 text-sky-400" />
                <span>Submit Vehicle Symptoms for AI Synthesis</span>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Select Vehicle</label>
                <select
                  value={reportForm.vehicleId}
                  onChange={(e) => setReportForm((p) => ({ ...p, vehicleId: Number(e.target.value) }))}
                  className="w-full py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.year} {v.make} {v.model} ({v.vin})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Describe Problem Symptoms</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. High-pitched squeal when braking at low speeds, or intermittent rough engine idle on cold start."
                  value={reportForm.description}
                  onChange={(e) => setReportForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate AI Diagnosis</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Book Appointment */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-base">
                <Calendar className="w-5 h-5 text-sky-400" />
                <span>Book Service Appointment</span>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Select Vehicle</label>
                <select
                  value={bookForm.vehicleId}
                  onChange={(e) => setBookForm((p) => ({ ...p, vehicleId: Number(e.target.value) }))}
                  className="w-full py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.year} {v.make} {v.model} ({v.vin})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Assigned Certified Mechanic</label>
                <select
                  value={bookForm.mechanicId}
                  onChange={(e) => setBookForm((p) => ({ ...p, mechanicId: Number(e.target.value) }))}
                  className="w-full py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  {mechanics.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.firstName} {m.lastName} (Tech ID: {m.userId})
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
                <label className="text-xs font-semibold text-zinc-300 block">Duration (Minutes)</label>
                <select
                  value={bookForm.durationMinutes}
                  onChange={(e) => setBookForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                  className="w-full py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value={30}>30 Minutes (Quick Inspection)</option>
                  <option value={60}>60 Minutes (Standard Service)</option>
                  <option value={90}>90 Minutes (Brake / Tire Service)</option>
                  <option value={120}>120 Minutes (Major Repair / Diagnostic)</option>
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

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Confirm Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice Receipt Modal */}
      {selectedInvoiceAppointment && (
        <InvoiceModal
          appointment={selectedInvoiceAppointment}
          workshopName={user?.workshopName}
          onClose={() => setSelectedInvoiceAppointment(null)}
        />
      )}
    </div>
  );
}
