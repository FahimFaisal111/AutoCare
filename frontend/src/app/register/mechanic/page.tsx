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
      subtitle="Register as an authorized service technician"
      footer={
        <p>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-[#635bff] hover:underline">
            Sign In
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          label="Staff Email Address"
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
        <div className="space-y-2">
          <FormInput
            label="Workshop Access Code"
            name="workshopAccessCode"
            id="mech-access-code"
            placeholder="e.g. UP-MTR-2026 or APEX-2026"
            required
            value={formData.workshopAccessCode}
            onChange={handleChange}
            error={validationErrors.workshopAccessCode}
            helperText="Enter hiring workshop code or choose from active list"
            icon={<Key className="w-4 h-4" />}
          />

          {availableWorkshops.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#635bff]" /> Quick Select:
              </span>
              {availableWorkshops.map((ws) => (
                <button
                  type="button"
                  key={ws.workshopId}
                  onClick={() => handleSelectWorkshop(ws.accessCode)}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
                    formData.workshopAccessCode === ws.accessCode
                      ? "bg-[#635bff] text-white border-[#635bff] shadow-sm"
                      : "bg-white text-[#0a2540] hover:bg-gray-50 border-gray-200"
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
          helperText="Unique internal employee ID"
          icon={<Wrench className="w-4 h-4" />}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-sm shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(99,91,255,0.3),0_8px_16px_rgba(99,91,255,0.25)] active:translate-y-0 active:scale-[0.98] transition-all duration-[300ms] ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering Staff Member...</span>
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
