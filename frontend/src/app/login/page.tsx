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
      setErrorMessage(error.message || "Authentication failed. Please verify your credentials.");
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
          <Link href="/register/customer" className="font-semibold text-[#635bff] hover:underline">
            Register as Customer
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errorMessage && <AlertMessage type="error" message={errorMessage} />}

        <FormInput
          label="Username or Email"
          type="text"
          name="email"
          id="login-email"
          placeholder="admin or name@workshop.com"
          required
          autoComplete="username"
          value={formData.email}
          onChange={handleChange}
          icon={<Mail className="w-4 h-4" />}
        />

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#0a2540]">Password</label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#635bff] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-sm shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(99,91,255,0.3),0_8px_16px_rgba(99,91,255,0.25)] active:translate-y-0 active:scale-[0.98] transition-all duration-[300ms] ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
}
