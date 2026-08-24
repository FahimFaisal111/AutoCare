"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Wrench, Shield, User as UserIcon, LogOut, ArrowRight, Building2 } from "lucide-react";
import { clsx } from "clsx";

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:border-sky-500/60 group-hover:bg-sky-500/20 transition-all duration-200">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-zinc-100 group-hover:text-white flex items-center gap-1.5">
              AutoCare <span className="text-sky-400">AI</span>
              <span className="text-[10px] font-mono uppercase bg-zinc-800/80 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                v1 SaaS
              </span>
            </span>
          </div>
        </Link>

        {/* Auth State / Nav Actions */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-8 w-24 bg-zinc-900 rounded-md animate-pulse border border-zinc-800" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {/* Tenant Workshop Badge */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-zinc-200">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[11px] text-sky-400 font-medium">
                  {user.workshopName} ({user.role})
                </span>
              </div>

              <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-lg transition-all active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/register/workshop"
                className={clsx(
                  "hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all",
                  pathname === "/register/workshop"
                    ? "bg-zinc-800 text-sky-300 border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>New Workshop</span>
              </Link>
              <Link
                href="/login"
                className={clsx(
                  "text-xs font-medium px-3.5 py-2 rounded-lg transition-all",
                  pathname === "/login"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                )}
              >
                Sign In
              </Link>
              <Link
                href="/register/customer"
                className={clsx(
                  "text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95",
                  pathname === "/register/customer"
                    ? "bg-sky-500 text-zinc-950 font-bold"
                    : "bg-sky-500 hover:bg-sky-400 text-zinc-950"
                )}
              >
                <span>Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
