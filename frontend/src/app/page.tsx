"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";
import { MechanicDashboard } from "@/components/dashboard/MechanicDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import {
  Wrench,
  Shield,
  User,
  Lock,
  Building2,
  Sparkles,
  Loader2,
  ArrowRight,
  Zap,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full max-w-md p-8 rounded-xl bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#635bff]" />
        <span className="text-xs text-gray-500 font-semibold">Initializing AutoCare Workspace...</span>
      </div>
    );
  }

  // Render role-tailored dynamic dashboard if authenticated
  if (user) {
    if (user.role === "CUSTOMER") {
      return <CustomerDashboard />;
    } else if (user.role === "MECHANIC") {
      return <MechanicDashboard />;
    } else if (user.role === "ADMIN") {
      return <AdminDashboard />;
    }
  }

  // Unauthenticated Stripe SaaS Landing Page
  return (
    <div className="max-w-6xl w-full flex flex-col items-center text-center space-y-12 py-6 md:py-12">
      {/* Stripe Hero Header */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20 text-xs font-semibold shadow-sm">
          <Zap className="w-3.5 h-3.5" />
          <span>Next-Generation Automotive Intelligence Infrastructure</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#0a2540] leading-tight">
          Automotive Service Platform,{" "}
          <span className="text-[#635bff]">Engineered for Scale</span>
        </h1>

        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Dynamic vehicle health telemetry, AI-driven diagnostic synthesis, and conflict-free multi-tenant service scheduling for modern automotive workshops.
        </p>
      </div>

      {/* 4 Role Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {/* 1. Register Workshop */}
        <Link
          href="/register/workshop"
          className="group bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out text-left space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-lg bg-[#635bff]/10 text-[#635bff] flex items-center justify-center group-hover:scale-110 transition-transform duration-[400ms]">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a2540]">Workshop Tenant</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Register a new auto repair shop with an isolated database tenant and administrator portal.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#635bff] group-hover:gap-2.5 transition-all">
            <span>Register Workshop</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 2. Customer Sign Up */}
        <Link
          href="/register/customer"
          className="group bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out text-left space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] flex items-center justify-center group-hover:scale-110 transition-transform duration-[400ms]">
              <User className="w-6 h-6 text-[#00a8cc]" />
            </div>
            <h3 className="text-base font-bold text-[#0a2540]">Customer Garage</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Manage personal vehicle fleets, run instant AI diagnostic checks, and book service bays.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#635bff] group-hover:gap-2.5 transition-all">
            <span>Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 3. Mechanic Staff */}
        <Link
          href="/register/mechanic"
          className="group bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out text-left space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-lg bg-[#7a73ff]/10 text-[#7a73ff] flex items-center justify-center group-hover:scale-110 transition-transform duration-[400ms]">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a2540]">Mechanic Staff</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Access assigned repair work orders, log parts & labor expenses, and verify diagnostic cases.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#635bff] group-hover:gap-2.5 transition-all">
            <span>Join Staff</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 4. Sign In */}
        <Link
          href="/login"
          className="group bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-[400ms] ease-out text-left space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-lg bg-gray-100 text-[#0a2540] flex items-center justify-center group-hover:scale-110 transition-transform duration-[400ms]">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a2540]">Sign In</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Sign in to your isolated workshop workspace with JWT authentication security.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#635bff] group-hover:gap-2.5 transition-all">
            <span>Access Session</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Feature Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left pt-6">
        <div className="p-6 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-[#635bff] font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>AI Diagnostic Engine</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Extracts symptoms into semantic token vectors, estimating probability of mechanical failure with confidence metrics.
          </p>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-[#00a8cc] font-bold text-sm">
            <Calendar className="w-4 h-4" />
            <span>Conflict-Free Scheduling</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Mathematical interval intersection validation guarantees technician bay availability before reservation commit.
          </p>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-[#0a2540] font-bold text-sm">
            <Shield className="w-4 h-4 text-[#635bff]" />
            <span>Pure 3NF Multi-Tenancy</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Strict third normal form relational database with foreign key cascading and complete cross-tenant data isolation.
          </p>
        </div>
      </div>
    </div>
  );
}
