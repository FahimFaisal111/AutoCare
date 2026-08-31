"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { User, Mail, Lock, Key, Phone, Loader2, ArrowRight, Building2 } from "lucide-react";
import { api, ApiError, WorkshopSummary } from "@/lib/api";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const { registerCustomer } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    workshopAccessCode: "",
    phone: "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      await registerCustomer(formData);
      router.push("/");
    } catch (err: unknown) {
      const error = err as ApiError;
      if (error.validationErrors) {
        setValidationErrors(error.validationErrors);
      }
      setErrorMessage(error.message || "Customer registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create Customer Account"
      subtitle="Register to access vehicle telemetry and AI diagnostics"
      footer={
        <p>
          Already have an account?{" "}
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
            id="cust-first-name"
            placeholder="Bruce"
            required
            value={formData.firstName}
            onChange={handleChange}
            error={validationErrors.firstName}
            icon={<User className="w-4 h-4" />}
          />
          <FormInput
            label="Last Name"
            name="lastName"
            id="cust-last-name"
            placeholder="Wayne"
            required
            value={formData.lastName}
            onChange={handleChange}
            error={validationErrors.lastName}
          />
        </div>

        <FormInput
          label="Email Address"
          type="email"
          name="email"
          id="cust-email"
          placeholder="bruce@waynecorp.com"
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
          id="cust-password"
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
            id="cust-access-code"
            placeholder="e.g. DT-CARE-2026 or APEX-2026"
            required
            value={formData.workshopAccessCode}
            onChange={handleChange}
            error={validationErrors.workshopAccessCode}
            helperText="Enter your workshop code or pick an active shop"
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
          label="Phone Number"
          type="tel"
          name="phone"
          id="cust-phone"
          placeholder="+1 (555) 000-0000"
          value={formData.phone}
          onChange={handleChange}
          error={validationErrors.phone}
          icon={<Phone className="w-4 h-4" />}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-sm shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(99,91,255,0.3),0_8px_16px_rgba(99,91,255,0.25)] active:translate-y-0 active:scale-[0.98] transition-all duration-[300ms] ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Complete Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
}
