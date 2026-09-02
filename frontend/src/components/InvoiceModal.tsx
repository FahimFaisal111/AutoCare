"use client";

import React from "react";
import { Appointment, WorkshopStats } from "@/lib/api";
import {
  FileText,
  Printer,
  X,
  Building2,
  Car,
  User,
  Wrench,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface InvoiceModalProps {
  appointment: Appointment | null;
  workshopName?: string;
  workshopAddress?: string;
  onClose: () => void;
}

export function InvoiceModal({
  appointment,
  workshopName = "Apex AutoCare Workshop",
  workshopAddress = "742 Evergreen Terrace, Springfield",
  onClose,
}: InvoiceModalProps) {
  if (!appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${String(appointment.appointmentId).padStart(6, "0")}`;
  const issueDate = new Date(appointment.scheduledStart).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:border-none print:bg-white print:text-black">
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-base">
            <FileText className="w-5 h-5 text-sky-400" />
            <span>Tax Invoice & Service Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs shadow transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto print:p-6 print:overflow-visible">
          {/* Workshop Header & Invoice Meta */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-zinc-800 print:border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-zinc-100 print:text-black">
                  {workshopName}
                </span>
              </div>
              <p className="text-xs text-zinc-400 print:text-gray-600 mt-1">
                {workshopAddress}
              </p>
              <span className="inline-block mt-2 text-[10px] font-mono uppercase bg-zinc-800 text-sky-400 px-2 py-0.5 rounded border border-zinc-700 print:bg-gray-100 print:text-black">
                Authorized Service Provider
              </span>
            </div>

            <div className="text-left sm:text-right space-y-1 text-xs">
              <span className="text-xs font-mono uppercase tracking-widest text-sky-400 print:text-blue-600 font-bold block">
                INVOICE
              </span>
              <span className="text-lg font-black text-zinc-100 print:text-black font-mono block">
                {invoiceNumber}
              </span>
              <span className="text-zinc-400 print:text-gray-600 block">
                Issued: {issueDate}
              </span>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-green-600 print:text-green-700">
                <CheckCircle2 className="w-3 h-3" />
                <span>{appointment.invoiceStatus || (appointment.status === "COMPLETED" ? "PAID" : "PENDING")}</span>
              </div>
            </div>
          </div>

          {/* Client & Vehicle Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 print:bg-gray-50 print:border-gray-200 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Billed Customer
              </span>
              <span className="font-bold text-zinc-200 print:text-black text-sm block">
                {appointment.ownerName}
              </span>
              <span className="text-zinc-400 print:text-gray-600">
                Customer ID: #{appointment.ownerId}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Vehicle & Technician
              </span>
              <span className="font-bold text-zinc-200 print:text-black text-sm block">
                {appointment.vehicleInfo}
              </span>
              <span className="text-zinc-400 print:text-gray-600 block">
                Certified Mechanic: {appointment.mechanicName} (ID #{appointment.mechanicId})
              </span>
            </div>
          </div>

          {/* Service Description Note */}
          {appointment.serviceDescription && (
            <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800 print:bg-transparent print:border-gray-200 text-xs space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Work Order / Service Log
              </span>
              <p className="text-zinc-300 print:text-black">{appointment.serviceDescription}</p>
            </div>
          )}

          {/* Itemized Cost Breakdown Table */}
          <div className="rounded-xl border border-zinc-800 print:border-gray-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 print:bg-gray-100 print:text-black font-semibold border-b border-zinc-800 print:border-gray-200">
                <tr>
                  <th className="p-3">Item / Service Line</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-right">Amount (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 print:divide-gray-200 text-zinc-300 print:text-black">
                <tr>
                  <td className="p-3 font-medium">
                    OEM Replacement Parts & Consumables
                    <span className="block text-[11px] text-zinc-500 print:text-gray-500">
                      Filters, brake pads, hydraulic fluid & components
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-zinc-400">PARTS</td>
                  <td className="p-3 text-right font-mono font-bold text-zinc-200 print:text-black">
                    ${appointment.partsCost.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">
                    Certified Technical Labor & Diagnostics
                    <span className="block text-[11px] text-zinc-500 print:text-gray-500">
                      Standard labor & computer scan ({appointment.durationMinutes} min allocation)
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-zinc-400">LABOR</td>
                  <td className="p-3 text-right font-mono font-bold text-zinc-200 print:text-black">
                    ${appointment.laborCost.toFixed(2)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-zinc-950/80 print:bg-gray-50 border-t-2 border-zinc-800 print:border-gray-300">
                <tr>
                  <td colSpan={2} className="p-3.5 text-right font-bold text-zinc-200 print:text-black text-sm">
                    Total Invoiced Amount:
                  </td>
                  <td className="p-3.5 text-right font-black font-mono text-emerald-400 print:text-black text-base">
                    ${appointment.totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-zinc-800 print:border-gray-200 text-center text-[11px] text-zinc-500 print:text-gray-600 space-y-1">
            <p>Thank you for trusting {workshopName} with your automotive maintenance.</p>
            <p className="font-mono text-[10px]">Generated dynamically via AutoCare AI Multi-Tenant SaaS Engine</p>
          </div>
        </div>
      </div>
    </div>
  );
}
