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
import { CollapsibleGroup } from "@/components/CollapsibleGroup";
import { groupAppointments } from "@/lib/appointmentGroups";
import { hasNewMessage, findActivity } from "@/lib/unreadTracker";
import { PartLine, buildServiceDescription, parseServiceDescription, sumParts } from "@/lib/serviceLog";
import {
  Wrench,
  Clock,
  CheckCircle2,
  BrainCircuit,
  Loader2,
  DollarSign,
  UserCheck,
  Calendar,
  AlertCircle,
  FileCheck,
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
  const [activeTab, setActiveTab] = useState<"queue" | "diagnostics">("queue");

  // Status update modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  /*Comment : The customer's original request, parsed out of the currently-open appointment - shown to the mechanic read-only for context, and carried forward unedited on save. This is the actual fix: it used to just live in the same field as the mechanic's own notes, so saving overwrote it; now it's tracked separately from statusForm and never touched by anything the mechanic types. */
  const [viewingCustomerRequest, setViewingCustomerRequest] = useState("");
  /*Comment : Which appointment's message thread is open right now, if any - Hero Feature 7, mirrors the same state/component CustomerDashboard uses, so both sides of the conversation share one implementation. */
  const [chatAppointment, setChatAppointment] = useState<Appointment | null>(null);
  /*Comment : "parts" replaces the old single partsCost number - the mechanic now builds an itemized list (name + cost per row, like adding poll options) instead of typing one aggregate figure. serviceDescription here holds ONLY the free-text narrative; the two are combined into one string right before the request goes out, via buildServiceDescription. */
  const [statusForm, setStatusForm] = useState({
    status: "IN_PROGRESS" as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
    parts: [{ name: "", cost: 0 }] as PartLine[],
    laborCost: 0,
    serviceDescription: "",
  });

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
      console.error("Failed to load mechanic workspace", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /*Comment : Reopening an appointment (e.g. it was already saved as IN_PROGRESS and the mechanic is coming back to finish it) needs to split its stored service_description back apart, so any parts already logged last time show up as editable rows again instead of being lost. */
  const handleOpenUpdateModal = (appt: Appointment) => {
    setSelectedAppointment(appt);
    const parsed = parseServiceDescription(appt.serviceDescription);
    setViewingCustomerRequest(parsed.customerRequest);
    setStatusForm({
      status: appt.status === "SCHEDULED" ? "IN_PROGRESS" : "COMPLETED",
      parts: parsed.parts.length > 0 ? parsed.parts : [{ name: "", cost: 0 }],
      laborCost: appt.laborCost || 0,
      serviceDescription: parsed.narrative,
    });
    setActionError("");
    setActionSuccess("");
  };

  /*Comment : Row-management for the parts list - append a blank row, remove one by index, or edit one field of one row. Kept as three small focused helpers rather than one do-everything function, so each button's onClick stays a one-liner. */
  const addPartRow = () => {
    setStatusForm((p) => ({ ...p, parts: [...p.parts, { name: "", cost: 0 }] }));
  };

  const removePartRow = (index: number) => {
    setStatusForm((p) => ({ ...p, parts: p.parts.filter((_, i) => i !== index) }));
  };

  const updatePartRow = (index: number, field: "name" | "cost", value: string) => {
    setStatusForm((p) => ({
      ...p,
      parts: p.parts.map((row, i) =>
        i === index ? { ...row, [field]: field === "cost" ? Number(value) : value } : row
      ),
    }));
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      /*Comment : viewingCustomerRequest is passed through unedited - this is the actual bug fix. The mechanic's narrative + itemized parts rows get combined with it, never in place of it, so the customer's original words survive this save exactly as they were, no matter what the mechanic writes here. partsCost is still computed as the sum of the itemized rows. */
      const combinedDescription = buildServiceDescription(viewingCustomerRequest, statusForm.serviceDescription, statusForm.parts);
      const partsTotal = sumParts(statusForm.parts);

      await api.updateAppointmentStatus(selectedAppointment.appointmentId, {
        status: statusForm.status,
        partsCost: partsTotal,
        laborCost: Number(statusForm.laborCost),
        serviceDescription: combinedDescription,
      });

      setActionSuccess(`Work order #${selectedAppointment.appointmentId} updated to ${statusForm.status}!`);
      setSelectedAppointment(null);
      await loadData();
    } catch (err: unknown) {
      const error = err as ApiError;
      setActionError(error.message || "Failed to update appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewReport = async (reportId: number) => {
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      await api.reviewProblemReport(reportId);
      setActionSuccess(`Diagnostic case #${reportId} verified and signed off by ${user?.firstName}!`);
      await loadData();
    } catch (err: unknown) {
      const error = err as ApiError;
      setActionError(error.message || "Failed to sign off diagnostic report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /*Comment : The "automatic reply" action for a diagnosis that has no appointment yet - sends a real Reminder to the customer's vehicle asking them to book, instead of the earlier chat-based approach which hit a hard wall (chat needs an appointment that doesn't exist for a fresh diagnosis). */
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

  /*Comment : Renders one work-order card - shared across all three Not Completed / Pending / Complete groups below. Same red "!" badge convention as CustomerDashboard's Messages button. "Complete" reads invoiceStatus passively (it's just PENDING vs PAID data already on the appointment) - there's deliberately no action here to change it. Marking an invoice paid belongs to hero feature 8 (payment status of invoices sent to customer), which is a separate piece of work. */
  const renderAppointmentCard = (a: Appointment) => {
    const isNew = hasNewMessage(findActivity(latestActivity, a.appointmentId), user?.userId);

    return (
      <div
        key={a.appointmentId}
        className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 shadow-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-mono">Work Order #{a.appointmentId}</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
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
            <h3 className="text-base font-bold text-zinc-100">{a.vehicleInfo}</h3>
          </div>

          <div className="flex items-center gap-2">
            {/*Comment : Same badge convention as the customer's side - a red "!" when the latest message is from the other participant and hasn't been marked seen on this browser yet. */}
            <button
              onClick={() => setChatAppointment(a)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sky-300 border border-zinc-700 text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Messages</span>
              {isNew && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-zinc-900">
                  !
                </span>
              )}
            </button>
            {a.status !== "COMPLETED" && (
              <button
                onClick={() => handleOpenUpdateModal(a)}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs shadow-sm transition-all"
              >
                {a.status === "SCHEDULED" ? "Start Repair" : "Update Costs & Complete"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
            <span className="text-zinc-500 font-medium block">Customer Owner</span>
            <span className="text-zinc-200 font-semibold mt-0.5 block">{a.ownerName}</span>
          </div>
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
            <span className="text-zinc-500 font-medium block">Scheduled Window</span>
            <span className="text-zinc-200 font-semibold mt-0.5 block">
              {new Date(a.scheduledStart).toLocaleString()} ({a.durationMinutes} min)
            </span>
          </div>
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
            <span className="text-zinc-500 font-medium block">Logged Costs</span>
            <span className="text-emerald-400 font-mono font-bold mt-0.5 block">
              Parts: ${a.partsCost.toFixed(2)} | Labor: ${a.laborCost.toFixed(2)}
            </span>
          </div>
        </div>

        {a.serviceDescription && (() => {
          const { customerRequest, narrative, parts } = parseServiceDescription(a.serviceDescription);
          return (
            <div className="text-xs text-zinc-300 space-y-2">
              {customerRequest && (
                <div>
                  <span className="text-zinc-500 font-semibold block mb-1">Customer&apos;s Request:</span>
                  <p className="p-3 bg-sky-950/20 rounded-xl border border-sky-500/30 text-zinc-200">
                    {customerRequest}
                  </p>
                </div>
              )}
              {narrative && (
                <div>
                  <span className="text-zinc-500 font-semibold block mb-1">Service Task Notes:</span>
                  <p className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60 text-zinc-200">
                    {narrative}
                  </p>
                </div>
              )}
              {parts.length > 0 && (
                <div>
                  <span className="text-zinc-500 font-semibold block mb-1">Parts Replaced:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {parts.map((p, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300"
                      >
                        {p.name} <span className="text-emerald-400 font-mono">${p.cost.toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {a.status === "COMPLETED" && (
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Work Completed & Invoice Stamped in DB</span>
            </div>
            <span className="font-mono font-bold text-emerald-300 text-sm">
              Total: ${a.totalAmount.toFixed(2)} ({a.invoiceStatus})
            </span>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <span className="text-sm text-zinc-400">Loading technician work orders...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-xl backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Technician Workspace
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Badge: {user?.employeeCode || `ID #${user?.userId}`} • Shop: {user?.workshopName}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-100">
            Welcome, Tech {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-zinc-400">
            Manage your assigned vehicle work orders, log billable parts and labor, and sign off AI diagnostic cases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase block">Active Jobs</span>
            <span className="text-lg font-bold text-sky-400 font-mono">
              {appointments.filter((a) => a.status !== "COMPLETED" && a.status !== "CANCELLED").length}
            </span>
          </div>
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase block">Completed</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {appointments.filter((a) => a.status === "COMPLETED").length}
            </span>
          </div>
        </div>
      </div>

      {actionSuccess && <AlertMessage type="success" message={actionSuccess} />}
      {actionError && <AlertMessage type="error" message={actionError} />}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab("queue")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "queue"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Assigned Service Queue ({appointments.length})</span>
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
          <span>Shop Diagnostic Cases ({reports.length})</span>
        </button>
      </div>

      {/* Tab 1: Service Queue */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-200">No Jobs Assigned</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Your assigned work queue is currently clear. New customer bookings will appear here in real time.
              </p>
            </div>
          ) : (
            /*Comment : Same 3-category grouping as the customer's side, using the identical shared helper - Not Completed (still needs work), Pending (done, unpaid), Complete (done, paid) - so both dashboards agree on what each bucket means. */
            (() => {
              const { notCompleted, pending, complete } = groupAppointments(appointments, latestActivity, user?.userId);
              return (
                <div className="space-y-4">
                  <CollapsibleGroup
                    title="Not Completed"
                    count={notCompleted.length}
                    accentClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
                  >
                    {notCompleted.map(renderAppointmentCard)}
                  </CollapsibleGroup>

                  <CollapsibleGroup
                    title="Pending Payment"
                    count={pending.length}
                    accentClass="bg-sky-500/10 text-sky-400 border-sky-500/20"
                  >
                    {pending.map(renderAppointmentCard)}
                  </CollapsibleGroup>

                  <CollapsibleGroup
                    title="Complete"
                    count={complete.length}
                    accentClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  >
                    {complete.map(renderAppointmentCard)}
                  </CollapsibleGroup>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Tab 2: Diagnostic Cases */}
      {activeTab === "diagnostics" && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-200">No Open Diagnostic Cases</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                All customer problem reports in your workshop have been resolved.
              </p>
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
                      <span className="text-xs text-zinc-500 font-mono">Case #{r.reportId}</span>
                      <h4 className="text-sm font-bold text-zinc-200">
                        {r.vehicleInfo} — Owned by {r.customerName}
                      </h4>
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
                      {/*Comment : Two options per case, gated on resolved status - not chat (that idea's been dropped; it needed an appointment that a fresh diagnosis doesn't have yet). Request Appointment only shows while the case is still OPEN - once resolved there's nothing left to ask the customer to book. */}
                      {r.status === "OPEN" && (
                        <button
                          onClick={() => handleRequestAppointment(r.reportId)}
                          disabled={isSubmitting}
                          className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sky-300 border border-zinc-700 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Request Appointment</span>
                        </button>
                      )}
                      {r.solution && !r.solution.reviewedBy && (
                        <button
                          onClick={() => handleReviewReport(r.reportId)}
                          disabled={isSubmitting}
                          className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Verify & Sign Off</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-xs text-zinc-300">
                    <span className="font-semibold text-zinc-500 block mb-1">Reported Issue:</span>
                    <p className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60 text-zinc-200">
                      {r.description}
                    </p>
                  </div>

                  {/* AI Solution Box */}
                  {r.solution && (
                    <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                          <BrainCircuit className="w-4 h-4" />
                          <span>AI Synthesis (Confidence: {Math.round(r.solution.confidenceScore * 100)}%)</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            r.solution.urgency === "HIGH"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          Urgency: {r.solution.urgency}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-semibold text-zinc-400 block">Probable Cause:</span>
                          <p className="text-zinc-200 mt-0.5">{r.solution.probableCause}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-400 block">Recommended Action:</span>
                          <p className="text-zinc-200 mt-0.5">{r.solution.recommendedAction}</p>
                        </div>
                      </div>

                      {r.solution.reviewerName && (
                        <div className="pt-2 border-t border-sky-500/20 flex items-center gap-1.5 text-[11px] text-emerald-400">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Technician Sign-Off: {r.solution.reviewerName}</span>
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

      {/* UPDATE MODAL */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-base">
                <Wrench className="w-5 h-5 text-sky-400" />
                <span>Update Work Order #{selectedAppointment.appointmentId}</span>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              {/*Comment : Read-only - shown for context so the mechanic can see what was actually asked for, but there's no input here for it. It gets carried forward automatically on save (see handleUpdateStatus); editing the customer's own words isn't something this form offers. */}
              {viewingCustomerRequest && (
                <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-1">
                  <span className="text-[11px] font-bold text-sky-400 block">Customer&apos;s Original Request</span>
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap">{viewingCustomerRequest}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Work Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm((p) => ({ ...p, status: e.target.value as any }))}
                  className="w-full py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="IN_PROGRESS">IN_PROGRESS (Currently Servicing)</option>
                  <option value="COMPLETED">COMPLETED (Finished & Generate Invoice)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {/*Comment : Parts Replaced - the itemized bill builder. Each row is one line item (part name + its cost); "Add Part" appends a blank row the same way adding a poll option would. Parts Total below is computed live from these rows, not typed in separately. */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 block">Parts Replaced</label>
                  <button
                    type="button"
                    onClick={addPartRow}
                    className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Part</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {statusForm.parts.map((row, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Part name"
                        value={row.name}
                        onChange={(e) => updatePartRow(index, "name", e.target.value)}
                        className="flex-1 py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={row.cost || ""}
                        onChange={(e) => updatePartRow(index, "cost", e.target.value)}
                        className="w-24 py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                      />
                      {statusForm.parts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePartRow(index)}
                          className="text-zinc-500 hover:text-rose-400 text-xs font-bold px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-[11px] text-zinc-400 pt-1">
                  <span>Parts Total</span>
                  <span className="font-mono font-semibold text-zinc-200">${sumParts(statusForm.parts).toFixed(2)}</span>
                </div>
              </div>

              <FormInput
                label="Labor Cost ($)"
                name="laborCost"
                id="up-labor"
                type="number"
                step="0.01"
                value={statusForm.laborCost.toString()}
                onChange={(e) => setStatusForm((p) => ({ ...p, laborCost: Number(e.target.value) }))}
                icon={<DollarSign className="w-4 h-4" />}
              />

              <FormInput
                label="Completed Work Description"
                name="serviceDescription"
                id="up-desc"
                placeholder="e.g. Tested brake pressure and confirmed no further fluid leakage"
                value={statusForm.serviceDescription}
                onChange={(e) => setStatusForm((p) => ({ ...p, serviceDescription: e.target.value }))}
              />

              {/*Comment : Grand total now sums the live Parts Total (from the rows above) with Labor Cost - matches exactly what gets sent to the backend as partsCost + laborCost. */}
              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 flex justify-between text-xs">
                <span className="text-zinc-400 font-medium">Calculated Invoice Total:</span>
                <span className="font-mono font-extrabold text-emerald-400">
                  ${(sumParts(statusForm.parts) + Number(statusForm.laborCost)).toFixed(2)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
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
                  <span>Save Updates</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*Comment : Hero Feature 7's chat modal, same shared component and same "only mounted while a chat is open" rule as CustomerDashboard, so the poll timer never runs for a thread nobody is looking at. */}
      {chatAppointment && (
        <AppointmentChatModal appointment={chatAppointment} onClose={() => setChatAppointment(null)} />
      )}
    </div>
  );
}
