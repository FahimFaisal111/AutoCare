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
  LatestActivity,
  ApiError,
  RecommendedSlot,
  TechnicianAvailabilityResponse,
} from "@/lib/api";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { InvoiceModal } from "@/components/InvoiceModal";
import { AppointmentChatModal } from "@/components/AppointmentChatModal";
import { AppointmentDetailModal } from "@/components/AppointmentDetailModal";
import { CollapsibleGroup } from "@/components/CollapsibleGroup";
import { groupAppointments } from "@/lib/appointmentGroups";
import { hasNewMessage, findActivity } from "@/lib/unreadTracker";
import { buildServiceDescription, parseServiceDescription } from "@/lib/serviceLog";
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
  History,
  MessageCircle,
  ChevronDown,
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

  const activeReminders = reminders.filter(
    (rem) => rem.vehicleId === vehicleId && (rem.status === "ACTIVE" || rem.status === "DUE")
  );
  if (activeReminders.length > 0) {
    const dueCount = activeReminders.filter((r) => r.isDue).length;
    const penalty = dueCount * 10 + (activeReminders.length - dueCount) * 4;
    score -= penalty;
    breakdown.push(
      `-${penalty} pts — ${activeReminders.length} active maintenance alert${activeReminders.length > 1 ? "s" : ""}${dueCount > 0 ? ` (${dueCount} due now)` : ""}`
    );
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
  /*Comment : Latest-message info for every appointment this customer is party to - drives both the "!" badge on Messages buttons and the "new message sorts to top" ordering, everywhere appointments are listed. */
  const [latestActivity, setLatestActivity] = useState<LatestActivity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  /*Comment : "history" is Hero Feature 6 (Digital Service & Maintenance History) - its own tab, separate from "appointments" which mixes upcoming bookings with reminders. */
  const [activeTab, setActiveTab] = useState<"garage" | "diagnostics" | "appointments" | "history">("garage");

  // Modals / Forms
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedInvoiceAppointment, setSelectedInvoiceAppointment] = useState<Appointment | null>(null);
  const [healthVehicle, setHealthVehicle] = useState<Vehicle | null>(null);
  /*Comment : Which appointment's message thread is open right now, if any - Hero Feature 7. Same "store the object, not just the id" reasoning as healthVehicle above, so AppointmentChatModal has what it needs the instant it opens. */
  const [chatAppointment, setChatAppointment] = useState<Appointment | null>(null);
  /*Comment : Which Service History entry's "Expand" detail view is open right now, if any - the itemized parts bill + linked AI diagnosis + mechanic's notes + cost summary. */
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);

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

  // Smart Slot Suggestions & Technician Availability
  const [availabilityData, setAvailabilityData] = useState<TechnicianAvailabilityResponse | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const fetchAvailability = async (targetDateStr?: string, duration?: number) => {
    setIsLoadingAvailability(true);
    try {
      const d = targetDateStr || (bookForm.scheduledStart ? bookForm.scheduledStart.slice(0, 10) : "");
      const dur = duration !== undefined ? duration : bookForm.durationMinutes;
      const res = await api.getTechnicianAvailability({
        date: d || undefined,
        durationMinutes: dur,
      });
      setAvailabilityData(res);
    } catch (err) {
      console.error("Failed to fetch technician availability", err);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (showBookModal) {
      const d = bookForm.scheduledStart ? bookForm.scheduledStart.slice(0, 10) : "";
      fetchAvailability(d, bookForm.durationMinutes);
    }
  }, [showBookModal, bookForm.durationMinutes]);

  const handleSelectSlot = (slot: RecommendedSlot) => {
    setBookForm((prev) => ({
      ...prev,
      mechanicId: slot.mechanicId,
      scheduledStart: slot.scheduledStart.slice(0, 16),
      durationMinutes: slot.durationMinutes,
    }));
  };

  const handleScheduledStartChange = (val: string) => {
    const prevDate = bookForm.scheduledStart ? bookForm.scheduledStart.slice(0, 10) : "";
    const newDate = val ? val.slice(0, 10) : "";
    setBookForm((p) => ({ ...p, scheduledStart: val }));
    if (newDate && newDate !== prevDate) {
      fetchAvailability(newDate, bookForm.durationMinutes);
    }
  };

  const loadData = async () => {
    try {
      const [vList, rList, aList, remList, mList, activityList] = await Promise.all([
        api.getVehicles().catch(() => []),
        api.getProblemReports().catch(() => []),
        api.getAppointments().catch(() => []),
        api.getReminders().catch(() => []),
        api.getWorkshopMechanics().catch(() => []),
        api.getLatestMessageActivity().catch(() => []),
      ]);

      setLatestActivity(activityList);

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
          serviceDescription: "Customer Request: Front brake inspection, rotor resurfacing, and sensor calibration.",
          partsCost: 150,
          laborCost: 120,
          totalAmount: 270,
          invoiceStatus: "PENDING",
          createdAt: new Date().toISOString(),
        },
        {
          appointmentId: 100,
          vehicleId: 1,
          vehicleInfo: "2023 Tesla Model 3 Long Range",
          ownerId: user?.userId || 2,
          ownerName: `${user?.firstName || "Sarah"} ${user?.lastName || "Connor"}`,
          mechanicId: 3,
          mechanicName: "Marcus Vance",
          reportId: 501,
          scheduledStart: new Date(Date.now() - 86400000).toISOString(),
          durationMinutes: 90,
          status: "COMPLETED",
          serviceDescription: "Customer Request: Front brake squeal on cold start.\nParts: Brake Pads ($120.00), Brake Rotor ($150.00)\nReplaced front brake pads and rotors, bled hydraulic brake lines, and recalibrated wheel speed sensors.",
          partsCost: 270,
          laborCost: 180,
          totalAmount: 450,
          invoiceStatus: "PAID",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          appointmentId: 99,
          vehicleId: 2,
          vehicleInfo: "2022 Ford Mustang GT",
          ownerId: user?.userId || 2,
          ownerName: `${user?.firstName || "Sarah"} ${user?.lastName || "Connor"}`,
          mechanicId: 4,
          mechanicName: "Elena Rostova",
          scheduledStart: new Date(Date.now() - 172800000).toISOString(),
          durationMinutes: 60,
          status: "COMPLETED",
          serviceDescription: "Customer Request: 2-year scheduled service and synthetic oil change.\nParts: Full Synthetic Oil ($65.00), OEM Oil Filter ($25.00)\nPerformed oil change and multipoint safety inspection.",
          partsCost: 90,
          laborCost: 110,
          totalAmount: 200,
          invoiceStatus: "PENDING",
          createdAt: new Date(Date.now() - 172800000).toISOString(),
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
      /*Comment : Wraps the customer's own note in the same "Customer Request:" marker buildServiceDescription uses everywhere else, from the moment the appointment is created. That's what lets it survive later - when the mechanic saves their own write-up, they parse this back out and carry it forward untouched, instead of it just being raw text a second raw-text save can blindly overwrite. */
      const initialDescription = buildServiceDescription(bookForm.serviceDescription, "", []);

      await api.createAppointment({
        vehicleId: Number(bookForm.vehicleId),
        mechanicId: Number(bookForm.mechanicId),
        reportId: bookForm.reportId ? Number(bookForm.reportId) : undefined,
        scheduledStart: bookForm.scheduledStart,
        durationMinutes: Number(bookForm.durationMinutes),
        serviceDescription: initialDescription,
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

  /*Comment : Renders one appointment card - shared across all three Not Completed / Pending / Complete groups on the Appointments tab. Only the customer's own note belongs on this quick-glance card - the mechanic's write-up is a separate concern that lives in the Service History "Expand" detail view instead. Shows a red "!" badge on the Messages button when there's an unread message waiting. */
  const renderAppointmentCard = (a: Appointment) => {
    const isNew = hasNewMessage(findActivity(latestActivity, a.appointmentId), user?.userId);
    const { customerRequest } = parseServiceDescription(a.serviceDescription);

    return (
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
          {customerRequest && (
            <p className="text-gray-600 text-[11px] mt-0.5">
              <span className="text-gray-400 font-semibold">Your Request: </span>
              {customerRequest}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {/*Comment : Opens this appointment's message thread - Hero Feature 7. The red "!" badge appears only when the latest message is from the other participant and hasn't been marked seen yet on this browser. */}
          <button
            onClick={() => setChatAppointment(a)}
            className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-[#0a2540] font-semibold text-xs shadow-sm hover:-translate-y-0.5 transition-all duration-[300ms] ease-out"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#635bff]" />
            <span>Messages</span>
            {isNew && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                !
              </span>
            )}
          </button>
          {a.status === "COMPLETED" && (
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-right space-y-0.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Invoiced</span>
                <span className="text-sm font-bold text-emerald-600 font-mono">
                  ${a.totalAmount.toFixed(2)}
                </span>
                <span className={`text-[10px] font-bold block ${a.invoiceStatus === "PAID" ? "text-emerald-600" : "text-amber-600"}`}>
                  {a.invoiceStatus || "PENDING"}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoiceAppointment(a)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-sm hover:-translate-y-0.5 transition-all"
                title="View and Print Tax Invoice Receipt"
              >
                <FileText className="w-4 h-4" />
                <span>Invoice</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
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
        {/*Comment : Fourth tab for Hero Feature 6 - a dedicated, cross-vehicle maintenance record, distinct from the per-vehicle mini-history inside the Vehicle Health modal below. */}
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-[300ms] ease-out flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-[#635bff] text-white shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5"
              : "bg-white border border-gray-200 text-[#0a2540] hover:bg-gray-50 hover:-translate-y-0.5 shadow-sm"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Service History ({appointments.filter((a) => a.status === "COMPLETED").length})</span>
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

                      {/* Advisory Warning Note */}
                      <div className="pt-2 border-t border-blue-200/70">
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200/80 text-amber-900 text-[11px] font-medium leading-relaxed shadow-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            Please contact Mechanic if you are not experienced, Ai generated responses are merely suggestions only, perform necessary actions only if you are an expert
                          </span>
                        </div>
                      </div>

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
          {/* Predictive Maintenance & Alerts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-[#0a2540]">Maintenance Reminders & Alerts</h3>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                {reminders.filter((r) => (r.status === "ACTIVE" || r.status === "DUE") && r.isDue).length} due now •{" "}
                {reminders.filter((r) => (r.status === "ACTIVE" || r.status === "DUE") && !r.isDue).length} upcoming
              </span>
            </div>

            {reminders.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm text-xs text-gray-500">
                No active maintenance alerts for your vehicles.
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Due Now (Action Required) */}
                {(() => {
                  const dueItems = reminders.filter(
                    (r) => (r.status === "ACTIVE" || r.status === "DUE") && r.isDue
                  );
                  if (dueItems.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>Action Required: Due Now ({dueItems.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {dueItems.map((rem) => (
                          <div
                            key={rem.reminderId}
                            className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 shadow-sm flex items-start gap-3.5 hover:shadow-md transition-all duration-200"
                          >
                            <div className="p-2.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div className="space-y-1.5 text-xs flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[#0a2540]">{rem.reminderType}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-600 text-white shadow-xs">
                                  {rem.dueReason === "MILEAGE_DUE" ? "MILEAGE DUE" : "CALENDAR DUE"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                <span className="font-semibold text-gray-700">{rem.vehicleInfo}</span>
                                <span className="text-gray-400">•</span>
                                <span className="font-mono text-gray-500">Target: {rem.dueDate}</span>
                              </div>
                              <p className="text-gray-700 text-[11px] leading-relaxed bg-white/70 p-2 rounded-md border border-rose-100">
                                {rem.message}
                              </p>
                              {rem.message?.includes("Default preventive-maintenance rule") && (
                                <span className="text-[10px] text-gray-400 font-medium italic block">
                                  * Default preventive-maintenance rule (general guidance)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Upcoming Maintenance */}
                {(() => {
                  const upcomingItems = reminders.filter(
                    (r) => (r.status === "ACTIVE" || r.status === "DUE") && !r.isDue
                  );
                  if (upcomingItems.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>Upcoming Preventive Maintenance ({upcomingItems.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {upcomingItems.map((rem) => (
                          <div
                            key={rem.reminderId}
                            className="p-4 rounded-xl bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 flex items-start gap-3.5 hover:shadow-md transition-all duration-200"
                          >
                            <div className="p-2.5 rounded-lg bg-blue-50 text-[#635bff] border border-blue-100 shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="space-y-1.5 text-xs flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[#0a2540]">{rem.reminderType}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                  Due: {rem.dueDate}
                                </span>
                              </div>
                              <span className="text-gray-500 block text-[11px]">{rem.vehicleInfo}</span>
                              <p className="text-gray-600 text-[11px] leading-relaxed">{rem.message}</p>
                              {rem.message?.includes("Default preventive-maintenance rule") && (
                                <span className="text-[10px] text-gray-400 font-medium italic block">
                                  * Default preventive-maintenance rule (general guidance)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
              (() => {
                const { notCompleted, pending, complete } = groupAppointments(appointments, latestActivity, user?.userId);
                return (
                  <div className="space-y-4">
                    <CollapsibleGroup title="Not Completed" count={notCompleted.length} accentClass="bg-amber-50 text-amber-700 border-amber-200">
                      {notCompleted.map(renderAppointmentCard)}
                    </CollapsibleGroup>
                    <CollapsibleGroup title="Pending Payment" count={pending.length} accentClass="bg-blue-50 text-[#635bff] border-blue-200">
                      {pending.map(renderAppointmentCard)}
                    </CollapsibleGroup>
                    <CollapsibleGroup title="Complete" count={complete.length} accentClass="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {complete.map(renderAppointmentCard)}
                    </CollapsibleGroup>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/*Comment : Tab 4: Service History - Hero Feature 6 (Digital Service & Maintenance History). Every COMPLETED appointment across ALL of the customer's vehicles, newest first (unread-message threads sort to the top), showing exactly what the spec calls for: work description, parts cost, labor cost. */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {(() => {
            const completedLogs = appointments
              .filter((a) => a.status === "COMPLETED")
              .sort((a, b) => {
                const aIsNew = hasNewMessage(findActivity(latestActivity, a.appointmentId), user?.userId);
                const bIsNew = hasNewMessage(findActivity(latestActivity, b.appointmentId), user?.userId);
                if (aIsNew !== bIsNew) return aIsNew ? -1 : 1;
                return new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime();
              });

            if (completedLogs.length === 0) {
              return (
                <div className="p-12 text-center rounded-xl bg-white border border-gray-200 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#635bff]/10 text-[#635bff] flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#0a2540]">No Completed Service Yet</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Once a mechanic marks a booked appointment as completed, its work log will show up here.
                  </p>
                </div>
              );
            }

            return completedLogs.map((a) => {
              const isNew = hasNewMessage(findActivity(latestActivity, a.appointmentId), user?.userId);
              return (
                <div
                  key={a.appointmentId}
                  className={`p-6 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border ${isNew ? "border-rose-300" : "border-gray-100"}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(a.scheduledStart).toLocaleDateString()}
                      </span>
                      <h3 className="text-base font-bold text-[#0a2540] flex items-center gap-1.5">
                        {a.vehicleInfo}
                        {isNew && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                            ! New Message
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Technician: <strong className="text-[#0a2540]">{a.mechanicName}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-right space-y-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Invoiced</span>
                        <span className="text-base font-bold text-emerald-600 font-mono">
                          ${a.totalAmount.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-bold block ${a.invoiceStatus === "PAID" ? "text-emerald-600" : "text-amber-600"}`}>
                          {a.invoiceStatus || "PENDING"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedInvoiceAppointment(a)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-sm hover:-translate-y-0.5 transition-all"
                          title="View and Print Tax Invoice Receipt"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Invoice</span>
                        </button>
                        <button
                          onClick={() => setDetailAppointment(a)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#0a2540] text-xs font-semibold transition-colors"
                        >
                          <span>Expand</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
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
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-5 border border-gray-100 text-[#0a2540]">
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

            {/* Smart Slot Suggestions */}
            <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-purple-50/50 rounded-xl border border-indigo-100/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0a2540]">
                  <Sparkles className="w-4 h-4 text-[#635bff]" />
                  <span>Smart Slot Suggestions</span>
                </div>
                {isLoadingAvailability ? (
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin text-[#635bff]" />
                    <span>Calculating slots...</span>
                  </div>
                ) : availabilityData?.workingHours ? (
                  <span className="text-[10px] text-gray-500 font-mono">
                    Mon–Sat {availabilityData.workingHours.open}–{availabilityData.workingHours.close}
                  </span>
                ) : null}
              </div>

              {availabilityData?.isClosed ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Workshop is closed on Sundays. Please select a Monday–Saturday date.</span>
                </div>
              ) : availabilityData?.recommendedSlots && availabilityData.recommendedSlots.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-gray-500">
                    Click a conflict-free recommended slot to auto-populate technician and appointment time:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availabilityData.recommendedSlots.map((slot, idx) => {
                      const isSelected =
                        bookForm.mechanicId === slot.mechanicId &&
                        bookForm.scheduledStart.startsWith(slot.scheduledStart.slice(0, 16));
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSlot(slot)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                            isSelected
                              ? "bg-[#635bff] text-white border-[#635bff] shadow-sm ring-2 ring-[#635bff]/30 scale-[1.02]"
                              : "bg-white hover:bg-purple-50/80 text-[#0a2540] border-gray-200 hover:border-[#635bff]/40 shadow-xs"
                          }`}
                        >
                          <Clock className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-[#635bff]"}`} />
                          <span>{slot.mechanicName.split(" ")[0]}</span>
                          <span className={isSelected ? "text-white/60" : "text-gray-400"}>·</span>
                          <span>{slot.displayDate === "Today" ? `Today ${slot.displayTime}` : `${slot.displayDate} ${slot.displayTime}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : !isLoadingAvailability ? (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
                  No open candidate slots found for this date. Choose another date or change service duration.
                </div>
              ) : null}
            </div>

            {/* Technician Availability Overview */}
            {availabilityData?.technicians && availabilityData.technicians.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0a2540]">Technicians</span>
                  <span className="text-[10px] text-gray-400">Database schedule status</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availabilityData.technicians.map((t) => {
                    const isAvail = t.isAvailable;
                    const isBusy = t.status.startsWith("Busy");
                    const isClosed = t.status.includes("Closed");
                    return (
                      <div
                        key={t.mechanicId}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                          isAvail
                            ? "bg-emerald-50/40 border-emerald-200/80 text-[#0a2540]"
                            : isBusy
                            ? "bg-amber-50/40 border-amber-200/80 text-[#0a2540]"
                            : isClosed
                            ? "bg-gray-50 border-gray-200 text-gray-500"
                            : "bg-red-50/40 border-red-200/80 text-[#0a2540]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isAvail
                                ? "bg-emerald-500"
                                : isBusy
                                ? "bg-amber-500"
                                : isClosed
                                ? "bg-gray-400"
                                : "bg-red-500"
                            }`}
                          />
                          <span className="font-medium truncate">{t.name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded border ${
                            isAvail
                              ? "bg-emerald-100/70 text-emerald-800 border-emerald-300/50"
                              : isBusy
                              ? "bg-amber-100/70 text-amber-800 border-amber-300/50"
                              : isClosed
                              ? "bg-gray-100 text-gray-600 border-gray-300/50"
                              : "bg-red-100/70 text-red-800 border-red-300/50"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                  {mechanics.map((m) => {
                    const techInfo = availabilityData?.technicians.find((t) => t.mechanicId === m.userId);
                    const statusSuffix = techInfo ? ` — ${techInfo.status}` : "";
                    return (
                      <option key={m.userId} value={m.userId}>
                        {m.firstName} {m.lastName} (Tech #{m.userId}){statusSuffix}
                      </option>
                    );
                  })}
                </select>
              </div>

              <FormInput
                label="Scheduled Date & Time"
                type="datetime-local"
                name="scheduledStart"
                id="appt-start"
                required
                value={bookForm.scheduledStart}
                onChange={(e) => handleScheduledStartChange(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a2540] block">Duration (Minutes)</label>
                <select
                  value={bookForm.durationMinutes}
                  onChange={(e) => {
                    const dur = Number(e.target.value);
                    setBookForm((p) => ({ ...p, durationMinutes: dur }));
                    fetchAvailability(undefined, dur);
                  }}
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

              {/* Optional - AI Diagnosis Code linking */}
              <FormInput
                label="AI Diagnosis Code (optional)"
                name="reportId"
                id="appt-report-code"
                type="number"
                placeholder="e.g. 12 - from a Report you filed under AI Diagnostics"
                value={bookForm.reportId?.toString() || ""}
                onChange={(e) =>
                  setBookForm((p) => ({
                    ...p,
                    reportId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
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
                  <p className="text-[10px] text-gray-400 italic">
                    Rule-based score from this vehicle&apos;s open reports, active reminders, and service recency — not a live AI call.
                  </p>
                </div>
              );
            })()}

            {/*Comment : Restored - this section was present in the original Feature 3 build but dropped from the visual overhaul this file is being merged with. Open Problem Reports — every issue reported for this vehicle that hasn't been resolved yet, with the AI's urgency rating shown so the most pressing ones stand out immediately. */}
            {(() => {
              const openReports = reports.filter(
                (r) => r.vehicleId === healthVehicle.vehicleId && r.status === "OPEN"
              );
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-bold text-[#0a2540]">
                      Open Problem Reports ({openReports.length})
                    </h4>
                  </div>
                  {openReports.length === 0 ? (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500">
                      No open problem reports for this vehicle.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {openReports.map((r) => (
                        <div key={r.reportId} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 font-mono">Report #{r.reportId}</span>
                            {r.solution && (
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold border ${
                                  r.solution.urgency === "HIGH"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : r.solution.urgency === "MEDIUM"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {r.solution.urgency}
                              </span>
                            )}
                          </div>
                          <p className="text-[#0a2540]">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/*Comment : Restored - same as above. Historical Service Logs — a chronological record of every appointment that's actually been completed on this vehicle. Parses service_description (which may now carry the "Customer Request:" / "Mechanic's Notes:" / "Parts Replaced:" markers) so it displays readable text, not raw markers. */}
            {(() => {
              const serviceLogs = appointments
                .filter((a) => a.vehicleId === healthVehicle.vehicleId && a.status === "COMPLETED")
                .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#635bff]" />
                    <h4 className="text-sm font-bold text-[#0a2540]">
                      Historical Service Logs ({serviceLogs.length})
                    </h4>
                  </div>
                  {serviceLogs.length === 0 ? (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500">
                      No completed service history yet for this vehicle.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {serviceLogs.map((a) => {
                        const { customerRequest, narrative } = parseServiceDescription(a.serviceDescription);
                        return (
                          <div key={a.appointmentId} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {new Date(a.scheduledStart).toLocaleDateString()}
                              </span>
                              <span className="text-[#0a2540] font-mono font-bold">${a.totalAmount.toFixed(2)}</span>
                            </div>
                            {customerRequest && (
                              <p className="text-gray-600">
                                <span className="text-gray-400 font-semibold">Your Request: </span>
                                {customerRequest}
                              </p>
                            )}
                            {narrative && (
                              <p className="text-gray-600">
                                <span className="text-gray-400 font-semibold">Mechanic&apos;s Notes: </span>
                                {narrative}
                              </p>
                            )}
                            <div className="flex gap-3 text-[11px] text-gray-500">
                              <span>Technician: {a.mechanicName}</span>
                              <span>Parts: ${a.partsCost.toFixed(2)}</span>
                              <span>Labor: ${a.laborCost.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Active & Due Maintenance Reminders */}
            {(() => {
              const vehicleReminders = reminders.filter(
                (rem) => rem.vehicleId === healthVehicle.vehicleId && (rem.status === "ACTIVE" || rem.status === "DUE")
              );
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h4 className="text-sm font-bold text-[#0a2540]">
                        Maintenance Reminders & Alerts ({vehicleReminders.length})
                      </h4>
                    </div>
                  </div>
                  {vehicleReminders.length === 0 ? (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500">
                      No active maintenance reminders for this vehicle.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {vehicleReminders.map((rem) => (
                        <div
                          key={rem.reminderId}
                          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                            rem.isDue
                              ? "bg-rose-50/60 border-rose-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className={`mt-0.5 ${rem.isDue ? "text-rose-600" : "text-amber-500"}`}>
                            {rem.isDue ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#0a2540]">{rem.reminderType}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                                  rem.isDue
                                    ? "bg-rose-600 text-white"
                                    : "bg-white border border-gray-200 text-gray-600"
                                }`}
                              >
                                {rem.isDue ? (rem.dueReason === "MILEAGE_DUE" ? "MILEAGE DUE" : "PAST DUE") : `Due: ${rem.dueDate}`}
                              </span>
                            </div>
                            <p className="text-gray-600 text-[11px] leading-relaxed">{rem.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/*Comment : Hero Feature 7's chat modal - only mounted while chatAppointment is set, so its polling effect genuinely stops existing the moment it's closed, not just visually hidden. */}
      {chatAppointment && (
        <AppointmentChatModal appointment={chatAppointment} onClose={() => setChatAppointment(null)} />
      )}

      {/*Comment : Service History's "Expand" detail modal - the itemized parts bill, linked AI diagnosis, mechanic's full notes, and cost summary for one completed appointment. Cross-references the appointment's optional reportId against the already-loaded reports array - no extra fetch needed. */}
      {detailAppointment && (
        <AppointmentDetailModal
          appointment={detailAppointment}
          problemReport={reports.find((r) => r.reportId === detailAppointment.reportId)}
          onClose={() => setDetailAppointment(null)}
          onViewInvoice={(appt) => setSelectedInvoiceAppointment(appt)}
        />
      )}

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
