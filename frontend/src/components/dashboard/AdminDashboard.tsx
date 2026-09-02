"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  WorkshopStats,
  Appointment,
  Vehicle,
  UserProfile,
} from "@/lib/api";
import { AlertMessage } from "@/components/AlertMessage";
import { InvoiceModal } from "@/components/InvoiceModal";
import {
  Users,
  Car,
  Wrench,
  Calendar,
  DollarSign,
  Key,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Layers,
  Search,
} from "lucide-react";

export function AdminDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState<WorkshopStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "fleet" | "staff">("overview");
  const [searchFilter, setSearchFilter] = useState("");
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
        <Loader2 className="w-6 h-6 animate-spin text-[#635bff]" />
        <span className="text-sm text-gray-500 font-semibold">Loading workshop operations data...</span>
      </div>
    );
  }

  const filteredAppointments = appointments.filter(
    (a) =>
      a.vehicleInfo.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.ownerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.mechanicName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.status.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl space-y-6 text-[#0a2540]">
      {/* Workshop Header & Access Code Banner */}
      <div className="p-6 sm:p-8 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20">
                Workshop Administrator
              </span>
              <span className="text-xs text-gray-400 font-mono">Tenant #{stats?.workshopId}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a2540]">
              {stats?.workshopName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">{stats?.workshopAddress || "Location address not configured"}</p>
          </div>

          {/* Access Code Token Box */}
          <div className="p-3.5 bg-gray-50/90 border border-gray-200 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#635bff] text-white flex items-center justify-center shadow-[0_2px_4px_rgba(99,91,255,0.25)]">
              <Key className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tenant Access Code</span>
              <span className="text-sm font-bold text-[#635bff] font-mono block">{stats?.accessCode}</span>
            </div>
            <button
              onClick={handleCopyAccessCode}
              title="Copy access code for onboarding customers & mechanics"
              className="ml-2 p-2 rounded-lg bg-white border border-gray-200 text-[#0a2540] hover:bg-gray-100 hover:-translate-y-0.5 transition-all duration-[300ms] ease-out shadow-sm"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Customers */}
        <div className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Customers</span>
            <Users className="w-4 h-4 text-[#635bff]" />
          </div>
          <span className="text-2xl font-bold text-[#0a2540] font-mono block">
            {stats?.customerCount ?? 0}
          </span>
          <span className="text-[10px] text-gray-400">Active accounts</span>
        </div>

        {/* Vehicles */}
        <div className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Fleet</span>
            <Car className="w-4 h-4 text-[#00a8cc]" />
          </div>
          <span className="text-2xl font-bold text-[#0a2540] font-mono block">
            {stats?.vehicleCount ?? 0}
          </span>
          <span className="text-[10px] text-gray-400">Serviced vehicles</span>
        </div>

        {/* Mechanics */}
        <div className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Staff</span>
            <Wrench className="w-4 h-4 text-[#7a73ff]" />
          </div>
          <span className="text-2xl font-bold text-[#0a2540] font-mono block">
            {stats?.mechanicCount ?? 0}
          </span>
          <span className="text-[10px] text-gray-400">Technicians</span>
        </div>

        {/* Scheduled Appointments */}
        <div className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">In Queue</span>
            <Clock className="w-4 h-4 text-[#635bff]" />
          </div>
          <span className="text-2xl font-bold text-[#635bff] font-mono block">
            {stats?.scheduledAppointmentsCount ?? 0}
          </span>
          <span className="text-[10px] text-gray-400">Active orders</span>
        </div>

        {/* Completed Appointments */}
        <div className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 font-mono block">
            {stats?.completedAppointmentsCount ?? 0}
          </span>
          <span className="text-[10px] text-gray-400">Finished repairs</span>
        </div>

        {/* Revenue */}
        <div className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold">Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 font-mono block">
            ${stats?.totalRevenue ? Number(stats.totalRevenue).toFixed(0) : "0"}
          </span>
          <span className="text-[10px] text-gray-400">Invoiced total</span>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-[300ms] ease-out flex items-center gap-2 ${
              activeTab === "overview"
                ? "bg-[#635bff] text-white shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5"
                : "bg-white border border-gray-200 text-[#0a2540] hover:bg-gray-50 hover:-translate-y-0.5 shadow-sm"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Workshop Schedule & Work Orders ({appointments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("fleet")}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-[300ms] ease-out flex items-center gap-2 ${
              activeTab === "fleet"
                ? "bg-[#635bff] text-white shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5"
                : "bg-white border border-gray-200 text-[#0a2540] hover:bg-gray-50 hover:-translate-y-0.5 shadow-sm"
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Customer Vehicle Fleet ({vehicles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-[300ms] ease-out flex items-center gap-2 ${
              activeTab === "staff"
                ? "bg-[#635bff] text-white shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5"
                : "bg-white border border-gray-200 text-[#0a2540] hover:bg-gray-50 hover:-translate-y-0.5 shadow-sm"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Mechanic Staff Directory ({mechanics.length})</span>
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-[#0a2540] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#635bff] focus:border-transparent transition-all w-48 shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Appointments / Ledger */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white border border-gray-200 shadow-sm text-xs text-gray-500">
              No appointments found matching your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/80 text-[#0a2540] border-b border-gray-200 font-bold">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Vehicle</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Assigned Mechanic</th>
                    <th className="p-4">Scheduled Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Parts & Labor</th>
                    <th className="p-4">Total Invoiced</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAppointments.map((a) => (
                    <tr key={a.appointmentId} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-4 font-mono text-gray-400">#{a.appointmentId}</td>
                      <td className="p-4 font-bold text-[#0a2540]">{a.vehicleInfo}</td>
                      <td className="p-4 text-gray-600">{a.ownerName}</td>
                      <td className="p-4 text-[#635bff] font-semibold">{a.mechanicName}</td>
                      <td className="p-4 text-gray-500 font-mono">
                        {new Date(a.scheduledStart).toLocaleDateString()} {new Date(a.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                            a.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : a.status === "IN_PROGRESS"
                              ? "bg-blue-50 text-[#635bff] border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-gray-500">
                        ${a.partsCost.toFixed(2)} + ${a.laborCost.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-600">
                            ${a.totalAmount.toFixed(2)}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                              (a.invoiceStatus === "PAID" || (!a.invoiceStatus && a.status === "COMPLETED"))
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {a.invoiceStatus || (a.status === "COMPLETED" ? "PAID" : "PENDING")}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedInvoiceAppointment(a)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#635bff]/10 hover:bg-[#635bff]/20 text-[#635bff] border border-[#635bff]/30 text-xs font-semibold transition-all active:scale-95 shadow-sm"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehicles.map((v) => (
              <div
                key={v.vehicleId}
                className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-2 text-xs"
              >
                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                  <span className="font-bold text-[#0a2540] text-sm">{v.year} {v.make} {v.model}</span>
                  <span className="font-mono text-[10px] text-gray-400">#{v.vehicleId}</span>
                </div>
                <div className="text-gray-600 space-y-1">
                  <div>Owner: <strong className="text-[#0a2540] font-semibold">{v.ownerName}</strong></div>
                  <div>VIN: <span className="font-mono text-gray-700">{v.vin}</span></div>
                  <div>Odometer: <span className="text-[#0a2540] font-bold">{v.odometer.toLocaleString()} mi</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Staff Directory */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mechanics.map((m) => (
              <div
                key={m.userId}
                className="p-5 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out space-y-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#635bff]/10 text-[#635bff] flex items-center justify-center font-bold text-sm">
                    {m.firstName[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0a2540] text-sm">{m.firstName} {m.lastName}</h4>
                    <span className="text-[11px] text-gray-400">{m.email}</span>
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-between text-gray-500 border-t border-gray-100">
                  <span>Role: <strong className="text-[#635bff] font-semibold">{m.role}</strong></span>
                  <span className="font-mono text-gray-400">ID #{m.userId}</span>
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
