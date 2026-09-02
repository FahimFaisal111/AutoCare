"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  Appointment,
  ProblemReport,
  LatestActivity,
  ApiError,
} from "@/lib/api";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { AppointmentChatModal } from "@/components/AppointmentChatModal";
import { InvoiceModal } from "@/components/InvoiceModal";
import { CollapsibleGroup } from "@/components/CollapsibleGroup";
import { groupAppointments } from "@/lib/appointmentGroups";
import { hasNewMessage, findActivity } from "@/lib/unreadTracker";
import { PartLine, buildServiceDescription, parseServiceDescription, sumParts } from "@/lib/serviceLog";
import {
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  FileCheck,
  FileText,
  BrainCircuit,
  X,
  AlertCircle,
  MessageCircle,
  Plus,
  Bell,
} from "lucide-react";

export function MechanicDashboard() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<ProblemReport[]>([]);
  /*Comment : Same "who has an unread message" data source CustomerDashboard uses - one shared endpoint, so both sides of a conversation agree on what counts as new. */
  const [latestActivity, setLatestActivity] = useState<LatestActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active work order update modal
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [selectedInvoiceAppointment, setSelectedInvoiceAppointment] = useState<Appointment | null>(null);
  const [apptStatus, setApptStatus] = useState<"SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("SCHEDULED");
  /*Comment : The customer's original request, parsed out of the currently-open appointment - shown to the mechanic read-only for context, and carried forward unedited on save. This is the actual fix for the bug where the mechanic's own save used to overwrite the customer's note entirely, since both used to share one raw text field. */
  const [viewingCustomerRequest, setViewingCustomerRequest] = useState("");
  /*Comment : "parts" replaces a single partsCost number - the mechanic builds an itemized list (name + cost per row, like adding poll options) instead of typing one aggregate figure. laborCost stays its own separate field, unchanged. */
  const [parts, setParts] = useState<PartLine[]>([{ name: "", cost: 0 }]);
  const [laborCost, setLaborCost] = useState(0);
  /*Comment : The free-text narrative only - never the combined description. Combined right before the request goes out, in handleUpdateAppt, via buildServiceDescription. */
  const [narrative, setNarrative] = useState("");
  const [currentOdo, setCurrentOdo] = useState("");

  // Manual reminder creation modal
  const [reminderVehicle, setReminderVehicle] = useState<{ vehicleId: number; vehicleInfo: string } | null>(null);
  const [reminderType, setReminderType] = useState("OIL_SERVICE");
  const [reminderDueDate, setReminderDueDate] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");

  /*Comment : Which appointment's message thread is open right now, if any - Hero Feature 7, mirrors the same state/component CustomerDashboard uses, so both sides of the conversation share one implementation. */
  const [chatAppointment, setChatAppointment] = useState<Appointment | null>(null);

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [aList, rList, activityList] = await Promise.all([
        api.getAppointments(),
        api.getProblemReports(),
        api.getLatestMessageActivity().catch(() => []),
      ]);
      setAppointments(aList);
      setReports(rList);
      setLatestActivity(activityList);
    } catch (err) {
      console.error("Failed to load technician data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /*Comment : Reopening an appointment needs to split its stored service_description back apart, so any parts already logged last time show up as editable rows again, and the customer's original request re-appears as read-only context instead of being lost. */
  const handleOpenApptModal = (appt: Appointment) => {
    setSelectedAppt(appt);
    setApptStatus(appt.status as any);
    const parsed = parseServiceDescription(appt.serviceDescription);
    setViewingCustomerRequest(parsed.customerRequest);
    setParts(parsed.parts.length > 0 ? parsed.parts : [{ name: "", cost: 0 }]);
    setNarrative(parsed.narrative);
    setLaborCost(appt.laborCost || 0);
    setCurrentOdo("");
    setActionError("");
    setActionSuccess("");
  };

  /*Comment : Row-management for the parts list - append a blank row, remove one by index, or edit one field of one row. */
  const addPartRow = () => setParts((p) => [...p, { name: "", cost: 0 }]);
  const removePartRow = (index: number) => setParts((p) => p.filter((_, i) => i !== index));
  const updatePartRow = (index: number, field: "name" | "cost", value: string) => {
    setParts((p) => p.map((row, i) => (i === index ? { ...row, [field]: field === "cost" ? Number(value) : value } : row)));
  };

  const handleUpdateAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      /*Comment : viewingCustomerRequest is passed through unedited - the actual bug fix. The mechanic's narrative + itemized parts rows get combined with it, never in place of it, so the customer's original words survive this save exactly as they were. partsCost is computed as the sum of the itemized rows, not typed in directly. */
      const combinedDescription = buildServiceDescription(viewingCustomerRequest, narrative, parts);
      const partsTotal = sumParts(parts);

      await api.updateAppointmentStatus(selectedAppt.appointmentId, {
        status: apptStatus,
        partsCost: partsTotal,
        laborCost: Number(laborCost),
        serviceDescription: combinedDescription,
        odometer: currentOdo ? parseInt(currentOdo, 10) : undefined,
      });
      setActionSuccess(`Work order #${selectedAppt.appointmentId} updated successfully.`);
      setSelectedAppt(null);
      await loadData();
    } catch (err: unknown) {
      const error = err as ApiError;
      setActionError(error.message || "Failed to update work order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderVehicle || !reminderDueDate) return;
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      await api.createVehicleReminder(reminderVehicle.vehicleId, {
        reminderType,
        dueDate: reminderDueDate,
        message: reminderMessage || `Technician-scheduled maintenance reminder for ${reminderDueDate}.`,
      });
      setActionSuccess(`Maintenance reminder scheduled for ${reminderVehicle.vehicleInfo}.`);
      setReminderVehicle(null);
      setReminderDueDate("");
      setReminderMessage("");
    } catch (err: unknown) {
      const error = err as ApiError;
      setActionError(error.message || "Failed to schedule reminder.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySolution = async (reportId: number) => {
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      await api.reviewProblemReport(reportId);
      setActionSuccess(`AI diagnostic case #${reportId} verified and signed off.`);
      await loadData();
    } catch (err: unknown) {
      const error = err as ApiError;
      setActionError(error.message || "Failed to verify diagnostic solution.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /*Comment : The "automatic reply" action for a diagnosis that has no appointment yet - sends a real Reminder to the customer's vehicle asking them to book, instead of an earlier chat-based approach which hit a hard wall (chat needs an appointment that doesn't exist for a fresh diagnosis). */
  const handleRequestAppointment = async (reportId: number) => {
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      await api.requestAppointment(reportId);
      setActionSuccess(`Appointment reminder sent to the customer for diagnostic case #${reportId}.`);
      await loadData();
    } catch (err: unknown) {
      const error = err as ApiError;
      setActionError(error.message || "Failed to send appointment reminder.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#635bff]" />
        <span className="text-sm text-gray-500 font-semibold">Opening technician station...</span>
      </div>
    );
  }

  const assignedAppointments = appointments.filter((a) => a.mechanicId === user?.userId);
  const activeJobs = assignedAppointments.filter((a) => a.status === "SCHEDULED" || a.status === "IN_PROGRESS");
  const completedJobs = assignedAppointments.filter((a) => a.status === "COMPLETED");

  /*Comment : Renders one work-order card - shared across all three Not Completed / Pending / Complete groups below. Red "!" badge on the Messages button when there's an unread message waiting. "Pending"/"Complete" read invoiceStatus passively - marking an invoice paid belongs to hero feature 8 (payment status of invoices sent to customer), a separate piece of work owned by the team, so there's deliberately no action here to change it. */
  const renderWorkOrderCard = (a: Appointment) => {
    const isNew = hasNewMessage(findActivity(latestActivity, a.appointmentId), user?.userId);
    const { customerRequest, narrative: mechNarrative, parts: mechParts } = parseServiceDescription(a.serviceDescription);

    return (
      <div
        key={a.appointmentId}
        className="p-6 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">Order #{a.appointmentId}</span>
              <span
                className={`text-[10px] px-3 py-0.5 rounded-full font-bold border ${
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
            <h3 className="text-base font-bold text-[#0a2540]">{a.vehicleInfo}</h3>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/*Comment : Same badge convention as the customer's side - a red "!" when the latest message is from the other participant and hasn't been marked seen on this browser yet. */}
            <button
              onClick={() => setChatAppointment(a)}
              className="relative px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-[#0a2540] font-semibold text-xs shadow-sm hover:-translate-y-0.5 transition-all duration-[300ms] ease-out flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-[#635bff]" />
              <span>Messages</span>
              {isNew && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  !
                </span>
              )}
            </button>
            <button
              onClick={() => setReminderVehicle({ vehicleId: a.vehicleId, vehicleInfo: a.vehicleInfo })}
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-[#0a2540] font-semibold text-xs shadow-sm hover:-translate-y-0.5 transition-all duration-[300ms] ease-out flex items-center gap-1"
              title="Schedule Maintenance Reminder"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Reminder</span>
            </button>
            <button
              onClick={() => handleOpenApptModal(a)}
              className="px-4 py-2 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              <span>Update Work Order</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
          <div>Customer: <strong className="text-[#0a2540]">{a.ownerName}</strong></div>
          <div>Scheduled: <strong className="text-[#0a2540] font-mono">{new Date(a.scheduledStart).toLocaleString()}</strong></div>
          <div>Duration: <strong className="text-[#0a2540]">{a.durationMinutes} min</strong></div>
          <div className="flex items-center gap-1.5">
            <span>Invoiced: <strong className="text-emerald-600 font-mono">${a.totalAmount.toFixed(2)}</strong></span>
            {a.status === "COMPLETED" && (
              <button
                type="button"
                onClick={() => setSelectedInvoiceAppointment(a)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#635bff]/10 hover:bg-[#635bff]/20 text-[#635bff] border border-[#635bff]/30 text-[11px] font-semibold transition-colors"
                title="View Tax Invoice Receipt"
              >
                <FileText className="w-3 h-3" />
                <span>Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/*Comment : Customer's request and the mechanic's own write-up are two genuinely different pieces of text (see serviceLog.ts) - shown as two separately labeled sections so they're never mixed together the way the original bug used to mix them. */}
        {customerRequest && (
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-gray-700">
            <span className="font-bold text-[#635bff] uppercase tracking-wider block text-[10px]">Customer&apos;s Request</span>
            <p className="mt-1 text-[#0a2540]">{customerRequest}</p>
          </div>
        )}
        {mechNarrative && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
            <span className="font-bold text-gray-400 uppercase tracking-wider block text-[10px]">Service Notes</span>
            <p className="mt-1 text-[#0a2540]">{mechNarrative}</p>
          </div>
        )}
        {mechParts.length > 0 && (
          <div>
            <span className="font-bold text-gray-400 uppercase tracking-wider block text-[10px] mb-1.5">Parts Replaced</span>
            <div className="flex flex-wrap gap-1.5">
              {mechParts.map((p, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                  {p.name} <span className="text-emerald-600 font-mono font-bold">${p.cost.toFixed(2)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl space-y-6 text-[#0a2540]">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20">
                Technician Station
              </span>
              <span className="text-xs text-gray-400 font-mono">Employee #{user?.userId}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a2540]">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Assigned to <strong className="text-[#0a2540]">{user?.workshopName}</strong> service bays.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs">
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">In Queue</span>
              <span className="text-lg font-bold text-[#635bff] font-mono">{activeJobs.length}</span>
            </div>
            <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs">
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Completed</span>
              <span className="text-lg font-bold text-emerald-600 font-mono">{completedJobs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {actionSuccess && <AlertMessage type="success" message={actionSuccess} />}
      {actionError && <AlertMessage type="error" message={actionError} />}

      {/* Main Grid: Work Orders + Diagnostic Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
        {/* Left 2 Cols: Assigned Service Work Orders, grouped Not Completed / Pending / Complete */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#635bff]" />
              <h2 className="text-base font-bold text-[#0a2540]">Assigned Service Work Orders</h2>
            </div>
            <span className="text-xs text-gray-400 font-mono font-semibold">Total ({assignedAppointments.length})</span>
          </div>

          {assignedAppointments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl shadow-sm border border-gray-200 text-xs text-gray-500">
              No appointments currently assigned to your queue.
            </div>
          ) : (
            /*Comment : Same 3-category grouping as the customer's side, using the identical shared helper - Not Completed (still needs work), Pending (done, unpaid), Complete (done, paid) - so both dashboards agree on what each bucket means. */
            (() => {
              const { notCompleted, pending, complete } = groupAppointments(assignedAppointments, latestActivity, user?.userId);
              return (
                <div className="space-y-4">
                  <CollapsibleGroup title="Not Completed" count={notCompleted.length} accentClass="bg-amber-50 text-amber-700 border-amber-200">
                    {notCompleted.map(renderWorkOrderCard)}
                  </CollapsibleGroup>
                  <CollapsibleGroup title="Pending Payment" count={pending.length} accentClass="bg-blue-50 text-[#635bff] border-blue-200">
                    {pending.map(renderWorkOrderCard)}
                  </CollapsibleGroup>
                  <CollapsibleGroup title="Complete" count={complete.length} accentClass="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {complete.map(renderWorkOrderCard)}
                  </CollapsibleGroup>
                </div>
              );
            })()
          )}
        </div>

        {/* Right Col: AI Diagnostics Verification Queue */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#00a8cc]" />
            <h2 className="text-base font-bold text-[#0a2540]">Diagnostic Verifications</h2>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-200 text-xs text-gray-500">
              No problem reports currently filed.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => (
                <div
                  key={r.reportId}
                  className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <span className="font-bold text-[#0a2540] text-sm">{r.vehicleInfo}</span>
                    <span className="text-gray-400 font-mono text-[10px]">#{r.reportId}</span>
                  </div>

                  <p className="text-gray-600 line-clamp-2 leading-relaxed">{r.description}</p>

                  {r.solution && (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-[#635bff] font-bold text-[11px]">
                        <span>AI Hypothesis</span>
                        <span>{Math.round(r.solution.confidenceScore * 100)}% Match</span>
                      </div>
                      <p className="text-[#0a2540] font-semibold text-[11px]">{r.solution.probableCause}</p>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${
                        r.status === "RESOLVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {r.status}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Two options per case, plus reminder scheduler */}
                      <button
                        onClick={() => setReminderVehicle({ vehicleId: r.vehicleId, vehicleInfo: r.vehicleInfo })}
                        className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-[#0a2540] font-semibold text-xs flex items-center gap-1 transition-all duration-[300ms] ease-out hover:-translate-y-0.5"
                        title="Schedule Maintenance Reminder"
                      >
                        <Bell className="w-3.5 h-3.5 text-amber-500" />
                        <span>Reminder</span>
                      </button>
                      {r.status === "OPEN" && (
                        <button
                          onClick={() => handleRequestAppointment(r.reportId)}
                          disabled={isSubmitting}
                          className="px-3 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-[#0a2540] font-bold text-xs flex items-center gap-1 transition-all duration-[300ms] ease-out hover:-translate-y-0.5 disabled:opacity-50"
                        >
                          <Clock className="w-3.5 h-3.5 text-[#635bff]" />
                          <span>Request Appointment</span>
                        </button>
                      )}
                      {r.solution && !r.solution.reviewedBy && (
                        <button
                          onClick={() => handleVerifySolution(r.reportId)}
                          disabled={isSubmitting}
                          className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-1 transition-all duration-[300ms] ease-out hover:-translate-y-0.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sign Off</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* UPDATE WORK ORDER MODAL */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-5 border border-gray-100 text-[#0a2540]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 font-bold text-base">
                <Wrench className="w-5 h-5 text-[#635bff]" />
                <span>Update Work Order #{selectedAppt.appointmentId}</span>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAppt} className="space-y-4">
              {/*Comment : Read-only - shown for context so the mechanic can see what was actually asked for. Carried forward automatically on save; editing the customer's own words isn't something this form offers. */}
              {viewingCustomerRequest && (
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                  <span className="text-[11px] font-bold text-[#635bff] block">Customer&apos;s Original Request</span>
                  <p className="text-xs text-[#0a2540] whitespace-pre-wrap">{viewingCustomerRequest}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a2540] block">Job Status</label>
                <select
                  value={apptStatus}
                  onChange={(e) => setApptStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm font-medium"
                >
                  <option value="SCHEDULED">SCHEDULED (Awaiting Bay)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Currently on Hoist)</option>
                  <option value="COMPLETED">COMPLETED (Repairs Finished)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {/*Comment : Parts Replaced - the itemized bill builder. Each row is one line item (part name + its cost); "Add Part" appends a blank row the same way adding a poll option would. Parts Total is computed live from these rows, not typed in separately. */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#0a2540] block">Parts Replaced</label>
                  <button
                    type="button"
                    onClick={addPartRow}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#635bff] hover:text-[#5349e0]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Part</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {parts.map((row, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Part name"
                        value={row.name}
                        onChange={(e) => updatePartRow(index, "name", e.target.value)}
                        className="flex-1 p-2 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={row.cost || ""}
                        onChange={(e) => updatePartRow(index, "cost", e.target.value)}
                        className="w-24 p-2 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm"
                      />
                      {parts.length > 1 && (
                        <button type="button" onClick={() => removePartRow(index)} className="text-gray-400 hover:text-red-500 text-xs font-bold px-1">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                  <span>Parts Total</span>
                  <span className="font-mono font-bold text-[#0a2540]">${sumParts(parts).toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="Labor Cost ($)"
                  name="laborCost"
                  id="upd-labor"
                  type="number"
                  step="0.01"
                  required
                  value={laborCost.toString()}
                  onChange={(e) => setLaborCost(Number(e.target.value))}
                />
                <FormInput
                  label="Current Odometer (km)"
                  name="currentOdometer"
                  id="upd-odo"
                  type="number"
                  placeholder="e.g. 52000"
                  value={currentOdo}
                  onChange={(e) => setCurrentOdo(e.target.value)}
                />
              </div>

              <FormInput
                label="Completed Work Description"
                name="narrative"
                id="upd-desc"
                placeholder="e.g. Tested brake pressure and confirmed no further fluid leakage"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
              />

              {/* Dynamic Invoice Calculation */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-gray-500 font-semibold">Computed Invoice Total:</span>
                <span className="text-base font-bold text-emerald-600 font-mono">
                  ${(sumParts(parts) + Number(laborCost || 0)).toFixed(2)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAppt(null)}
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
                  <span>Save Work Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Feature 7's chat modal */}
      {chatAppointment && (
        <AppointmentChatModal appointment={chatAppointment} onClose={() => setChatAppointment(null)} />
      )}

      {/* Manual Reminder Creation Modal */}
      {reminderVehicle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-[#0a2540]">Schedule Maintenance Reminder</h3>
              </div>
              <button onClick={() => setReminderVehicle(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
              Target Vehicle: <strong className="text-[#0a2540]">{reminderVehicle.vehicleInfo}</strong>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#0a2540] block mb-1">Reminder Type</label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm font-medium"
                >
                  <option value="OIL_SERVICE">Oil & Filter Service</option>
                  <option value="TIRE_ROTATION">Tire Rotation & Balance</option>
                  <option value="BRAKE_INSPECTION">Brake System Inspection</option>
                  <option value="COOLANT_SERVICE">Coolant Flush & Cooling Check</option>
                  <option value="TRANSMISSION_FLUID">Transmission Fluid Service</option>
                  <option value="ROUTINE_INSPECTION">Multi-Point Annual Inspection</option>
                  <option value="GENERAL_MAINTENANCE">General Preventive Maintenance</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0a2540] block mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={reminderDueDate}
                  onChange={(e) => setReminderDueDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0a2540] block mb-1">Reminder Note / Message</label>
                <textarea
                  rows={3}
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder="e.g. Front brake pads are at 4mm. Schedule rotor and pad replacement by next quarter."
                  className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-xs text-[#0a2540] focus:outline-none focus:ring-2 focus:ring-[#635bff] shadow-sm resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReminderVehicle(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !reminderDueDate}
                  className="px-5 py-2.5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  <span>Save Reminder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
