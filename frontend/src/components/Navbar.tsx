"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Wrench, LogOut, ArrowRight, Building2, ChevronRight, User } from "lucide-react";
import { clsx } from "clsx";

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#635bff] text-white flex items-center justify-center font-bold shadow-[0_2px_4px_rgba(99,91,255,0.25)] group-hover:-translate-y-0.5 transition-all duration-[300ms] ease-out">
            <Wrench className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-[#0a2540]">
              AutoCare <span className="text-[#635bff]">AI</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#635bff]/10 text-[#635bff] px-2 py-0.5 rounded-full">
              Automotive SaaS
            </span>
          </div>
        </Link>

        {/* Auth State / Nav Actions */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {/* Tenant Workshop Badge */}
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-bold text-[#0a2540]">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[11px] text-gray-500 font-medium">
                  {user.workshopName} · <strong className="text-[#635bff] font-semibold">{user.role}</strong>
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0a2540] hover:text-red-600 bg-white hover:bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-lg transition-all duration-[300ms] ease-out shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/register/workshop"
                className={clsx(
                  "hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg transition-all duration-[300ms] ease-out",
                  pathname === "/register/workshop"
                    ? "bg-[#635bff]/10 text-[#635bff]"
                    : "text-[#0a2540] hover:text-[#635bff] hover:bg-gray-50"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>New Workshop</span>
              </Link>
              <Link
                href="/login"
                className={clsx(
                  "text-xs font-semibold px-3.5 py-2 rounded-lg transition-all duration-[300ms] ease-out",
                  pathname === "/login"
                    ? "bg-[#635bff]/10 text-[#635bff]"
                    : "text-[#0a2540] hover:text-[#635bff] hover:bg-gray-50"
                )}
              >
                Sign In
              </Link>
              <Link
                href="/register/customer"
                className="px-4 py-2 bg-[#635bff] hover:bg-[#5349e0] text-white text-xs font-semibold rounded-lg shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(99,91,255,0.3),0_8px_16px_rgba(99,91,255,0.25)] active:translate-y-0 active:scale-[0.98] transition-all duration-[300ms] ease-out flex items-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
