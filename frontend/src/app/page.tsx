"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Wrench, Shield, User, ArrowRight, CheckCircle2, Lock, Car } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="max-w-3xl w-full flex flex-col items-center text-center space-y-8">
      {/* Brand Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-semibold">
        <Car className="w-3.5 h-3.5" />
        <span>3NF Multi-Tenant Relational SaaS</span>
      </div>

      {/* Main Heading */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-100">
          AutoCare <span className="text-sky-400">AI</span> Platform
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Integrated vehicle health management, AI diagnostic synthesis, and conflict-free service scheduling for modern automotive workshops.
        </p>
      </div>

      {/* Auth Status Card */}
      {isLoading ? (
        <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse h-48" />
      ) : user ? (
        <div className="w-full max-w-lg bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 text-left space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold">
                {user.firstName[0]}
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-xs text-zinc-400">{user.email}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Authenticated
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
              <span className="text-zinc-500 font-medium block">Tenant Workshop</span>
              <span className="text-zinc-200 font-semibold mt-0.5 block">{user.workshopName}</span>
              <span className="text-[10px] text-zinc-500 font-mono">ID: {user.workshopId}</span>
            </div>
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
              <span className="text-zinc-500 font-medium block">System Role</span>
              <span className="text-sky-400 font-semibold mt-0.5 block">{user.role}</span>
              <span className="text-[10px] text-zinc-500 font-mono">UID: {user.userId}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {/* Sign In Card */}
          <Link
            href="/login"
            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-sky-500/50 transition-all duration-200 shadow-lg text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-sky-500/20 text-zinc-300 group-hover:text-sky-400 flex items-center justify-center mb-3 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-zinc-200 group-hover:text-white">Sign In</span>
            <span className="text-xs text-zinc-500 mt-1">Access your workspace</span>
          </Link>

          {/* Customer Register Card */}
          <Link
            href="/register/customer"
            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-sky-500/50 transition-all duration-200 shadow-lg text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-sky-500/20 text-zinc-300 group-hover:text-sky-400 flex items-center justify-center mb-3 transition-colors">
              <User className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-zinc-200 group-hover:text-white">Customer Sign Up</span>
            <span className="text-xs text-zinc-500 mt-1">Join with access code</span>
          </Link>

          {/* Mechanic Register Card */}
          <Link
            href="/register/mechanic"
            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-sky-500/50 transition-all duration-200 shadow-lg text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-sky-500/20 text-zinc-300 group-hover:text-sky-400 flex items-center justify-center mb-3 transition-colors">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-zinc-200 group-hover:text-white">Mechanic Onboarding</span>
            <span className="text-xs text-zinc-500 mt-1">Register staff badge</span>
          </Link>
        </div>
      )}
    </div>
  );
}
