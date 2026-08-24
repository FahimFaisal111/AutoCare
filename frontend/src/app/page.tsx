"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";
import { MechanicDashboard } from "@/components/dashboard/MechanicDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { Wrench, Shield, User, ArrowRight, Lock, Car, Building2, Sparkles } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse h-48 flex items-center justify-center">
        <span className="text-xs text-zinc-500 font-mono">Initializing AutoCare AI session...</span>
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

  // Unauthenticated landing page with dynamic registration choices
  return (
    <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-8">
      {/* Brand Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-semibold shadow-inner">
        <Car className="w-3.5 h-3.5" />
        <span>3NF Multi-Tenant Automotive SaaS</span>
      </div>

      {/* Main Heading */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-100">
          AutoCare <span className="text-sky-400">AI</span> Platform
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Dynamic vehicle health telemetry, AI-driven diagnostic synthesis, and conflict-free multi-tenant service scheduling for automotive workshops.
        </p>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* 1. Register Workshop */}
        <Link
          href="/register/workshop"
          className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-sky-500/50 transition-all duration-200 shadow-lg text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-800 group-hover:bg-purple-500/20 text-zinc-300 group-hover:text-purple-400 flex items-center justify-center mb-3 transition-colors">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-zinc-200 group-hover:text-white">New Workshop</span>
          <span className="text-xs text-zinc-500 mt-1">Register shop tenant & admin</span>
        </Link>

        {/* 2. Customer Sign Up */}
        <Link
          href="/register/customer"
          className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-sky-500/50 transition-all duration-200 shadow-lg text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-800 group-hover:bg-sky-500/20 text-zinc-300 group-hover:text-sky-400 flex items-center justify-center mb-3 transition-colors">
            <User className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-zinc-200 group-hover:text-white">Customer Sign Up</span>
          <span className="text-xs text-zinc-500 mt-1">Garage, diagnostics & booking</span>
        </Link>

        {/* 3. Mechanic Onboarding */}
        <Link
          href="/register/mechanic"
          className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-sky-500/50 transition-all duration-200 shadow-lg text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-800 group-hover:bg-amber-500/20 text-zinc-300 group-hover:text-amber-400 flex items-center justify-center mb-3 transition-colors">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-zinc-200 group-hover:text-white">Mechanic Staff</span>
          <span className="text-xs text-zinc-500 mt-1">Technician work order queue</span>
        </Link>

        {/* 4. Sign In */}
        <Link
          href="/login"
          className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-sky-500/50 transition-all duration-200 shadow-lg text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-800 group-hover:bg-emerald-500/20 text-zinc-300 group-hover:text-emerald-400 flex items-center justify-center mb-3 transition-colors">
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-zinc-200 group-hover:text-white">Sign In</span>
          <span className="text-xs text-zinc-500 mt-1">Access existing workspace</span>
        </Link>
      </div>

      {/* Feature Highlights */}
      <div className="pt-6 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left text-xs">
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-1.5">
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>AI Diagnostic Engine</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Instant NLP synthesis of vehicle symptoms with confidence ratings and indexed repair keywords.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <Shield className="w-4 h-4" />
            <span>Conflict-Free Scheduling</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Mathematical non-overlapping interval validation guarantees technician availability before booking.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Car className="w-4 h-4" />
            <span>Dynamic Multi-Tenancy</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            100% dynamic DB persistence in strict 3NF with complete data isolation across workshop tenants.
          </p>
        </div>
      </div>
    </div>
  );
}
