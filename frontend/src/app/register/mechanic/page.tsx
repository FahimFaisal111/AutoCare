"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { User, Mail, Lock, Key, Wrench, Loader2, ArrowRight, Building2 } from "lucide-react";
import { api, ApiError, WorkshopSummary } from "@/lib/api";

export default function MechanicRegisterPage() {
  const router = useRouter();
  const { registerMechanic } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    workshopAccessCode: "",
    employeeCode: "",
  });

  const [availableWorkshops, setAvailableWorkshops] = useState<WorkshopSummary[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const workshops = await api.getWorkshops();
        setAvailableWorkshops(workshops);
      } catch (err) {
        console.warn("Could not fetch workshop list", err);
      }
    };
    fetchWorkshops();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (errorMessage) setErrorMessage("");
  };

  const handleSelectWorkshop = (code: string) => {
    setFormData((prev) => ({ ...prev, workshopAccessCode: code }));
    if (validationErrors.workshopAccessCode) {
      setValidationErrors((prev) => ({ ...prev, workshopAccessCode: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setValidationErrors({});

    try {
      await registerMechanic(formData);
      router.push("/");
    } catch (err: unknown) {
      const error = err as ApiError;
      if (error.validationErrors) {
        setValidationErrors(error.validationErrors);
      }
      setErrorMessage(error.message || "Mechanic onboarding failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Mechanic Staff Onboarding"
      subtitle="Register a certified service technician account"
      footer={
        <p>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors">
            Sign In
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {errorMessage && <AlertMessage type="error" message={errorMessage} />}

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="First Name"
            name="firstName"
            id="mech-first-name"
            placeholder="Frank"
            required
            value={formData.firstName}
            onChange={handleChange}
            error={validationErrors.firstName}
            icon={<User className="w-4 h-4" />}
          />
          <FormInput
            label="Last Name"
            name="lastName"
            id="mech-last-name"
            placeholder="Castle"
            required
            value={formData.lastName}
            onChange={handleChange}
            error={validationErrors.lastName}
          />
        </div>

        <FormInput
          label="Staff Email"
          type="email"
          name="email"
          id="mech-email"
          placeholder="frank@workshop.com"
          required
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={validationErrors.email}
          icon={<Mail className="w-4 h-4" />}
        />

        <FormInput
          label="Password"
          type="password"
          name="password"
          id="mech-password"
          placeholder="At least 6 characters"
          required
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          error={validationErrors.password}
          icon={<Lock className="w-4 h-4" />}
        />

        {/* Dynamic Workshop Picker */}
        <div className="space-y-1.5">
          <FormInput
            label="Workshop Access Code"
            name="workshopAccessCode"
            id="mech-access-code"
            placeholder="e.g. UP-MTR-2026 or APEX-2026"
            required
            value={formData.workshopAccessCode}
            onChange={handleChange}
            error={validationErrors.workshopAccessCode}
            helperText="Enter the hiring workshop code or select an active shop"
            icon={<Key className="w-4 h-4" />}
          />

          {availableWorkshops.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Quick Select:
              </span>
              {availableWorkshops.map((ws) => (
                <button
                  type="button"
                  key={ws.workshopId}
                  onClick={() => handleSelectWorkshop(ws.accessCode)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    formData.workshopAccessCode === ws.accessCode
                      ? "bg-sky-500/20 border-sky-500/40 text-sky-300 font-semibold"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  {ws.name} ({ws.accessCode})
                </button>
              ))}
            </div>
          )}
        </div>

        <FormInput
          label="Employee Badge Code"
          name="employeeCode"
          id="mech-employee-code"
          placeholder="e.g. EMP-009 or TECH-101"
          required
          value={formData.employeeCode}
          onChange={handleChange}
          error={validationErrors.employeeCode}
          helperText="Assigned technician employee ID (must be unique)"
          icon={<Wrench className="w-4 h-4" />}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-3 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering Technician...</span>
            </>
          ) : (
            <>
              <span>Complete Staff Onboarding</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
}
