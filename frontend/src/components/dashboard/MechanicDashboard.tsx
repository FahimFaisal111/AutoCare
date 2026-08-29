"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  Appointment,
  ProblemReport,
  ApiError,
} from "@/lib/api";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import {
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  FileCheck,
  BrainCircuit,
  X,
  AlertCircle,
} from "lucide-react";

export function MechanicDashboard() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active work order update modal
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [apptStatus, setApptStatus] = useState<"SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("SCHEDULED");
  const [partsCost, setPartsCost] = useState(0);
  const [laborCost, setLaborCost] = useState(0);

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [aList, rList] = await Promise.all([
        api.getAppointments(),
        api.getProblemReports(),
      ]);
      setAppointments(aList);
      setReports(rList);
    } catch (err) {
      console.error("Failed to load technician data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenApptModal = (appt: Appointment) => {
    setSelectedAppt(appt);
    setApptStatus(appt.status as any);
    setPartsCost(appt.partsCost || 0);
    setLaborCost(appt.laborCost || 0);
    setActionError("");
    setActionSuccess("");
  };

  const handleUpdateAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      await api.updateAppointmentStatus(selectedAppt.appointmentId, {
        status: apptStatus,
        partsCost: Number(partsCost),
        laborCost: Number(laborCost),
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
        {/* Left 2 Cols: Assigned Service Work Orders */}
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
            <div className="space-y-4">
              {assignedAppointments.map((a) => (
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

                    <button
                      onClick={() => handleOpenApptModal(a)}
                      className="px-4 py-2 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-xs shadow-[0_2px_4px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 transition-all duration-[300ms] ease-out flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Update Work Order</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Customer: <strong className="text-[#0a2540]">{a.ownerName}</strong></div>
                    <div>Scheduled: <strong className="text-[#0a2540] font-mono">{new Date(a.scheduledStart).toLocaleString()}</strong></div>
                    <div>Duration: <strong className="text-[#0a2540]">{a.durationMinutes} min</strong></div>
                    <div>Invoiced: <strong className="text-emerald-600 font-mono">${a.totalAmount.toFixed(2)}</strong></div>
                  </div>

                  {a.serviceDescription && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                      <span className="font-bold text-gray-400 uppercase tracking-wider block text-[10px]">Service Notes</span>
                      <p className="mt-1 text-[#0a2540]">{a.serviceDescription}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
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

                  <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${
                        r.status === "RESOLVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {r.status}
                    </span>

                    {r.status !== "RESOLVED" && (
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* UPDATE WORK ORDER MODAL */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-5 border border-gray-100 text-[#0a2540]">
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

              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Parts Cost ($)"
                  name="partsCost"
                  id="upd-parts"
                  type="number"
                  step="0.01"
                  required
                  value={partsCost.toString()}
                  onChange={(e) => setPartsCost(Number(e.target.value))}
                />
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
              </div>

              {/* Dynamic Invoice Calculation */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-gray-500 font-semibold">Computed Invoice Total:</span>
                <span className="text-base font-bold text-emerald-600 font-mono">
                  ${(Number(partsCost || 0) + Number(laborCost || 0)).toFixed(2)}
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
    </div>
  );
}
