"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await login(formData);
      router.push("/");
    } catch (err: unknown) {
      const error = err as ApiError;
      setErrorMessage(error.message || "Failed to authenticate. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Sign in to your isolated workshop workspace"
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/register/customer" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors">
            Register as Customer
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && <AlertMessage type="error" message={errorMessage} />}

        <FormInput
          label="Email Address"
          type="email"
          name="email"
          id="login-email"
          placeholder="name@workshop.com"
          required
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          icon={<Mail className="w-4 h-4" />}
        />

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">Password</label>
            <Link
              href="/forgot-password"
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <FormInput
              type="password"
              name="password"
              id="login-password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              icon={<Lock className="w-4 h-4" />}
            />
          </div>
        </div>


        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* 1-Click Instant Demo Login (No Account Creation Needed) */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            <span>⚡ Instant Demo Access (No DB Required)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                loginAsDemo("ADMIN");
                router.push("/");
              }}
              className="py-2 px-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-semibold transition-all text-center flex flex-col items-center gap-1 shadow-sm"
            >
              <span>👑 Admin</span>
              <span className="text-[10px] text-zinc-500">Workshop Telemetry</span>
            </button>

            <button
              type="button"
              onClick={() => {
                loginAsDemo("MECHANIC");
                router.push("/");
              }}
              className="py-2 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all text-center flex flex-col items-center gap-1 shadow-sm"
            >
              <span>🔧 Mechanic</span>
              <span className="text-[10px] text-zinc-500">Work Orders & AI</span>
            </button>

            <button
              type="button"
              onClick={() => {
                loginAsDemo("CUSTOMER");
                router.push("/");
              }}
              className="py-2 px-2.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-sky-200 text-xs font-semibold transition-all text-center flex flex-col items-center gap-1 shadow-sm"
            >
              <span>👤 Customer</span>
              <span className="text-[10px] text-zinc-500">Fleet & Booking</span>
            </button>
          </div>
        </div>
      </form>
    </AuthCard>
  );
}
