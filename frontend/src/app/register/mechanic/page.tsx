"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { User, Mail, Lock, Key, Wrench, BadgePercent, Loader2, ArrowRight } from "lucide-react";
import { ApiError } from "@/lib/api";

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

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (errorMessage) setErrorMessage("");
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

        <FormInput
          label="Workshop Access Code"
          name="workshopAccessCode"
          id="mech-access-code"
          placeholder="e.g. UP-MTR-2026"
          required
          value={formData.workshopAccessCode}
          onChange={handleChange}
          error={validationErrors.workshopAccessCode}
          helperText="Unique tenant code for the hiring workshop"
          icon={<Key className="w-4 h-4" />}
        />

        <FormInput
          label="Employee Badge Code"
          name="employeeCode"
          id="mech-employee-code"
          placeholder="e.g. EMP-DT-005"
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
