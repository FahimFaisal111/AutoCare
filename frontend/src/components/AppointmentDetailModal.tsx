"use client";

import React from "react";
import { Appointment, ProblemReport } from "@/lib/api";
import { parseServiceDescription } from "@/lib/serviceLog";
import { Wrench, FileText, MessageSquareText, Stethoscope, AlertTriangle } from "lucide-react";

interface AppointmentDetailModalProps {
  appointment: Appointment;
  /*Comment : The problem report this appointment was booked against, if any - optional because plenty of appointments (routine maintenance, an oil change) are booked directly with no prior AI diagnosis behind them. */
  problemReport?: ProblemReport;
  onClose: () => void;
  onViewInvoice?: (appointment: Appointment) => void;
}

/*Comment : The "Expand" view for a completed service - full itemized parts bill on the left, the mechanic's full written notes on the right (however long they are, no character limit), and the parts/labor/total cost summary pinned at the bottom. Closes only via the ✕ in its own top-right corner, matching every other modal in this app. */
export function AppointmentDetailModal({ appointment, problemReport, onClose, onViewInvoice }: AppointmentDetailModalProps) {
  /*Comment : customerRequest and narrative are two genuinely different pieces of text now, not one shared field that the mechanic's save used to clobber - what the customer originally asked for when booking, versus what the mechanic actually wrote once the work was done. */
  const { customerRequest, narrative, parts } = parseServiceDescription(appointment.serviceDescription);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">{appointment.vehicleInfo}</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {new Date(appointment.scheduledStart).toLocaleDateString()} · Technician: {appointment.mechanicName}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm font-bold">
            ✕
          </button>
        </div>

        {/*Comment : The customer's own original request, shown up front and full-width - separate from and above the parts/notes columns below, so it's never confused with what the mechanic wrote. */}
        {customerRequest && (
          <div className="p-4 border-b border-zinc-800 space-y-1.5">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-sky-400" />
              <span>Your Original Request</span>
            </h4>
            <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">{customerRequest}</p>
          </div>
        )}

        {/*Comment : "The problem for which the customer took the vehicle for" - the original symptom report that led to this appointment, plus whatever the AI diagnosis found, if this appointment was booked against one. Distinct from "Your Original Request" above: that's the note typed into the booking form itself, this is the separate problem-report flow (Hero Feature 4) that may have happened first. */}
        {problemReport && (
          <div className="p-4 border-b border-zinc-800 space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-sky-400" />
              <span>The Problem This Visit Was For</span>
            </h4>
            <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">{problemReport.description}</p>

            {problemReport.solution && (
              <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-400">AI Diagnostic Findings</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      problemReport.solution.urgency === "HIGH"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : problemReport.solution.urgency === "MEDIUM"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    Urgency: {problemReport.solution.urgency}
                  </span>
                </div>
                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-zinc-500 font-semibold block">Probable Cause:</span>
                    <p className="text-zinc-300">{problemReport.solution.probableCause}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-semibold block">Recommended Action:</span>
                    <p className="text-zinc-300">{problemReport.solution.recommendedAction}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Please contact Mechanic if you are not experienced, Ai generated responses are merely suggestions only, perform necessary actions only if you are an expert
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  Confidence: {Math.round(problemReport.solution.confidenceScore * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/*Comment : Two columns - parts bill on the left, mechanic's notes on the right. Stacks to one column on narrow screens since side-by-side stops being readable there. */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-sky-400" />
              <span>Parts Replaced</span>
            </h4>

            {parts.length > 0 ? (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                {parts.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 text-xs odd:bg-zinc-950/40 even:bg-zinc-950/10"
                  >
                    <span className="text-zinc-300">{p.name}</span>
                    <span className="font-mono text-zinc-400">${p.cost.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 text-xs bg-zinc-950/80 border-t border-zinc-800 font-semibold">
                  <span className="text-zinc-300">Parts Total</span>
                  <span className="font-mono text-emerald-400">${appointment.partsCost.toFixed(2)}</span>
                </div>
              </div>
            ) : appointment.partsCost > 0 ? (
              /*Comment : Appointments completed before this feature existed have a real partsCost but no itemized text to parse - say so plainly instead of showing a misleading empty list. */
              <p className="text-xs text-zinc-500">
                A parts cost of <span className="text-zinc-300 font-mono">${appointment.partsCost.toFixed(2)}</span>{" "}
                was recorded, but no itemized breakdown is available for this record.
              </p>
            ) : (
              <p className="text-xs text-zinc-500">No parts were used for this service.</p>
            )}
          </div>

          {/*Comment : "Small box" for the mechanic's written notes - scrolls internally if it runs long (they'll typically write a few hundred characters), but nothing here truncates or hard-caps the text itself. */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Mechanic&apos;s Notes</span>
            </h4>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {narrative || "No additional notes provided."}
            </div>
          </div>
        </div>

        {/*Comment : Cost summary footer - always reads from the appointment's real, authoritative partsCost/laborCost/totalAmount fields (never the parsed text), so it's correct even for older records with no itemized parts list to show above. */}
        <div className="border-t border-zinc-800 p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Parts Cost</span>
              <span className="font-mono">${appointment.partsCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Labor Cost</span>
              <span className="font-mono">${appointment.laborCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-zinc-100 pt-1.5 border-t border-zinc-800/80">
              <span>Total Cost</span>
              <span className="font-mono text-emerald-400">${appointment.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {onViewInvoice && (
            <button
              onClick={() => {
                onClose();
                onViewInvoice(appointment);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#635bff] hover:bg-[#5349e0] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
            >
              <FileText className="w-4 h-4" />
              <span>View &amp; Print Official Tax Invoice</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
