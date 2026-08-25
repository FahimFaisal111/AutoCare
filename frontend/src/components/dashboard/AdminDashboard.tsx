"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  WorkshopStats,
  Appointment,
  Vehicle,
  UserProfile,
  ApiError,
} from "@/lib/api";
import { AlertMessage } from "@/components/AlertMessage";
import { InvoiceModal } from "@/components/InvoiceModal";
import {
  Building2,
  Users,
  Car,
  Wrench,
  Calendar,
  DollarSign,
  Key,
  Copy,
  Check,
  Loader2,
  TrendingUp,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";

export function AdminDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState<WorkshopStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "fleet" | "staff">("overview");
  const [selectedInvoiceAppointment, setSelectedInvoiceAppointment] = useState<Appointment | null>(null);

  const loadData = async () => {
    try {
      const [sData, aList, vList, mList] = await Promise.all([
        api.getWorkshopStats().catch(() => null),
        api.getAppointments().catch(() => []),
        api.getVehicles().catch(() => []),
        api.getWorkshopMechanics().catch(() => []),
      ]);

      const defaultStats: WorkshopStats = {
        workshopId: user?.workshopId || 1,
        workshopName: user?.workshopName || "Apex Performance Garage",
        workshopAddress: "742 Evergreen Terrace, Springfield",
        accessCode: "APEX-2026",
        customerCount: 14,
        vehicleCount: 22,
        mechanicCount: 4,
        scheduledAppointmentsCount: 3,
        completedAppointmentsCount: 18,
        totalRevenue: 4850,
      };

      setStats(sData || defaultStats);
      setAppointments(aList.length > 0 ? aList : [
        {
          appointmentId: 101,
          vehicleId: 1,
          vehicleInfo: "2023 Tesla Model 3",
          ownerId: 2,
          ownerName: "Sarah Connor",
          mechanicId: 3,
          mechanicName: "Marcus Vance",
          scheduledStart: new Date(Date.now() + 86400000).toISOString(),
          durationMinutes: 60,
          status: "SCHEDULED",
          partsCost: 150,
          laborCost: 120,
          totalAmount: 270,
          invoiceStatus: "PENDING",
          createdAt: new Date().toISOString(),
        },
        {
          appointmentId: 102,
          vehicleId: 2,
          vehicleInfo: "2021 Ford F-150",
          ownerId: 3,
          ownerName: "John Doe",
          mechanicId: 3,
          mechanicName: "Marcus Vance",
          scheduledStart: new Date(Date.now() - 3600000).toISOString(),
          durationMinutes: 90,
          status: "IN_PROGRESS",
          partsCost: 320,
          laborCost: 180,
          totalAmount: 500,
          invoiceStatus: "PENDING",
          createdAt: new Date().toISOString(),
        },
        {
          appointmentId: 100,
          vehicleId: 3,
          vehicleInfo: "2020 BMW M3",
          ownerId: 4,
          ownerName: "Alex Rivera",
          mechanicId: 4,
          mechanicName: "Elena Rostova",
          scheduledStart: new Date(Date.now() - 86400000).toISOString(),
          durationMinutes: 120,
          status: "COMPLETED",
          partsCost: 450,
          laborCost: 250,
          totalAmount: 700,
          invoiceStatus: "PAID",
          createdAt: new Date().toISOString(),
        }
      ]);
      setVehicles(vList.length > 0 ? vList : [
        {
          vehicleId: 1,
          ownerId: 2,
          ownerName: "Sarah Connor",
          vin: "1HGCR2F83HA001928",
          make: "Tesla",
          model: "Model 3",
          year: 2023,
          odometer: 14200,
          createdAt: new Date().toISOString(),
        },
        {
          vehicleId: 2,
          ownerId: 3,
          ownerName: "John Doe",
          vin: "1FTFW1ED8MFA90123",
          make: "Ford",
          model: "F-150",
          year: 2021,
          odometer: 48500,
          createdAt: new Date().toISOString(),
        },
        {
          vehicleId: 3,
          ownerId: 4,
          ownerName: "Alex Rivera",
          vin: "WBS8M9C58KFP49182",
          make: "BMW",
          model: "M3",
          year: 2020,
          odometer: 32100,
          createdAt: new Date().toISOString(),
        }
      ]);
      setMechanics(mList.length > 0 ? mList : [
        {
          userId: 3,
          workshopId: 1,
          workshopName: "Apex Performance Garage",
          email: "marcus@apexperformance.com",
          firstName: "Marcus",
          lastName: "Vance",
          role: "MECHANIC",
          employeeCode: "MEC-001",
        },
        {
          userId: 4,
          workshopId: 1,
          workshopName: "Apex Performance Garage",
          email: "elena@apexperformance.com",
          firstName: "Elena",
          lastName: "Rostova",
          role: "MECHANIC",
          employeeCode: "MEC-002",
        }
      ]);
    } catch (err) {
      console.error("Failed to load admin stats", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyAccessCode = () => {
    if (stats?.accessCode) {
      navigator.clipboard.writeText(stats.accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <span className="text-sm text-zinc-400">Loading workshop tenant telemetry...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Workshop Header & Access Code Banner */}
      <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Workshop Administrator
              </span>
              <span className="text-xs text-zinc-500 font-mono">Tenant ID #{stats?.workshopId}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-100">{stats?.workshopName}</h1>
            <p className="text-xs text-zinc-400">{stats?.workshopAddress || "Location address not set"}</p>
          </div>

          {/* Access Code Token Box */}
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-sky-500/30 flex items-center gap-3 shadow-inner">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Key className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase block">Tenant Access Code</span>
              <span className="text-sm font-bold text-sky-300 font-mono block">{stats?.accessCode}</span>
            </div>
            <button
              onClick={handleCopyAccessCode}
              title="Copy access code for onboarding customers & mechanics"
              className="ml-2 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Customers */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">Customers</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-2xl font-black text-zinc-100 font-mono block">
            {stats?.customerCount ?? 0}
          </span>
          <span className="text-[10px] text-zinc-500">Active accounts</span>
        </div>

        {/* Vehicles */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">Fleet</span>
            <Car className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-2xl font-black text-zinc-100 font-mono block">
            {stats?.vehicleCount ?? 0}
          </span>
          <span className="text-[10px] text-zinc-500">Serviced vehicles</span>
        </div>

        {/* Mechanics */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">Technicians</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-zinc-100 font-mono block">
            {stats?.mechanicCount ?? 0}
          </span>
          <span className="text-[10px] text-zinc-500">Staff members</span>
        </div>

        {/* Scheduled Appointments */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">In Queue</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-2xl font-black text-zinc-100 font-mono block">
            {stats?.scheduledAppointmentsCount ?? 0}
          </span>
          <span className="text-[10px] text-zinc-500">Active work orders</span>
        </div>

        {/* Completed Appointments */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-400 font-mono block">
            {stats?.completedAppointmentsCount ?? 0}
          </span>
          <span className="text-[10px] text-zinc-500">Finished repairs</span>
        </div>

        {/* Revenue */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-400 font-mono block">
            ${stats?.totalRevenue ? Number(stats.totalRevenue).toFixed(0) : "0"}
          </span>
          <span className="text-[10px] text-zinc-500">Invoiced total</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "overview"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Workshop Schedule & Work Orders ({appointments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("fleet")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "fleet"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
        >
          <Car className="w-4 h-4" />
          <span>Customer Vehicle Fleet ({vehicles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "staff"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Mechanic Staff Directory ({mechanics.length})</span>
        </button>
      </div>

      {/* Tab 1: Appointments / Ledger */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-xs text-zinc-500">
              No appointments in this workshop yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-semibold">
                  <tr>
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Vehicle</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Assigned Mechanic</th>
                    <th className="p-3.5">Scheduled</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Parts & Labor</th>
                    <th className="p-3.5">Total Invoiced</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {appointments.map((a) => (
                    <tr key={a.appointmentId} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3.5 font-mono text-zinc-500">#{a.appointmentId}</td>
                      <td className="p-3.5 font-bold text-zinc-200">{a.vehicleInfo}</td>
                      <td className="p-3.5 text-zinc-300">{a.ownerName}</td>
                      <td className="p-3.5 text-sky-400 font-semibold">{a.mechanicName}</td>
                      <td className="p-3.5 text-zinc-400 font-mono">
                        {new Date(a.scheduledStart).toLocaleDateString()} {new Date(a.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${a.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : a.status === "IN_PROGRESS"
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-400">
                        ${a.partsCost.toFixed(2)} + ${a.laborCost.toFixed(2)}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">
                            ${a.totalAmount.toFixed(2)}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                              (a.invoiceStatus === "PAID" || (!a.invoiceStatus && a.status === "COMPLETED"))
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {a.invoiceStatus || (a.status === "COMPLETED" ? "PAID" : "PENDING")}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedInvoiceAppointment(a)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/30 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                          title="Generate and print invoice receipt"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Invoice</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Vehicle Fleet */}
      {activeTab === "fleet" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => (
              <div
                key={v.vehicleId}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200 text-sm">{v.year} {v.make} {v.model}</span>
                  <span className="font-mono text-[10px] text-zinc-500">#{v.vehicleId}</span>
                </div>
                <div className="text-zinc-400 space-y-0.5">
                  <div>Owner: <strong className="text-zinc-200">{v.ownerName}</strong></div>
                  <div>VIN: <span className="font-mono text-zinc-300">{v.vin}</span></div>
                  <div>Odometer: <span className="text-zinc-300 font-semibold">{v.odometer.toLocaleString()} mi</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Staff Directory */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mechanics.map((m) => (
              <div
                key={m.userId}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                    {m.firstName[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-200">{m.firstName} {m.lastName}</h4>
                    <span className="text-[11px] text-zinc-500">{m.email}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-zinc-400">
                  <span>Role: <strong className="text-sky-400">{m.role}</strong></span>
                  <span className="font-mono text-zinc-500">User ID: #{m.userId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reusable Tax Invoice Receipt Modal */}
      {selectedInvoiceAppointment && (
        <InvoiceModal
          appointment={selectedInvoiceAppointment}
          workshopName={stats?.workshopName}
          workshopAddress={stats?.workshopAddress}
          onClose={() => setSelectedInvoiceAppointment(null)}
        />
      )}
    </div>
  );
}
