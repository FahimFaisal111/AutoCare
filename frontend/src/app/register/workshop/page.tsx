"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { Building2, MapPin, Key, User, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { ApiError } from "@/lib/api";

export default function WorkshopRegisterPage() {
  const router = useRouter();
  const { registerWorkshop } = useAuth();

  const [formData, setFormData] = useState({
    workshopName: "",
    workshopAddress: "",
    accessCode: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
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
      await registerWorkshop(formData);
      router.push("/");
    } catch (err: unknown) {
      const error = err as ApiError;
      if (error.validationErrors) {
        setValidationErrors(error.validationErrors);
      }
      setErrorMessage(error.message || "Workshop registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Register Workshop Tenant"
      subtitle="Establish a new automotive repair shop & admin workspace"
      footer={
        <p>
          Already have a workshop registered?{" "}
          <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors">
            Sign In
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {errorMessage && <AlertMessage type="error" message={errorMessage} />}

        {/* Workshop Organization Details */}
        <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-3">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
            Workshop Information
          </span>

          <FormInput
            label="Workshop Name"
            name="workshopName"
            id="ws-name"
            placeholder="e.g. Apex Performance Garage"
            required
            value={formData.workshopName}
            onChange={handleChange}
            error={validationErrors.workshopName}
            icon={<Building2 className="w-4 h-4" />}
          />

          <FormInput
            label="Workshop Address"
            name="workshopAddress"
            id="ws-address"
            placeholder="e.g. 742 Evergreen Terrace, Springfield"
            value={formData.workshopAddress}
            onChange={handleChange}
            error={validationErrors.workshopAddress}
            icon={<MapPin className="w-4 h-4" />}
          />

          <FormInput
            label="Custom Tenant Access Code (Optional)"
            name="accessCode"
            id="ws-access-code"
            placeholder="e.g. APEX-2026 (Leave blank for auto-generated)"
            value={formData.accessCode}
            onChange={handleChange}
            error={validationErrors.accessCode}
            helperText="Code given to customers and technicians to link with your shop"
            icon={<Key className="w-4 h-4" />}
          />
        </div>

        {/* Workshop Admin Account */}
        <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-3">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
            Administrator Credentials
          </span>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="First Name"
              name="firstName"
              id="admin-first-name"
              placeholder="Dominic"
              required
              value={formData.firstName}
              onChange={handleChange}
              error={validationErrors.firstName}
              icon={<User className="w-4 h-4" />}
            />
            <FormInput
              label="Last Name"
              name="lastName"
              id="admin-last-name"
              placeholder="Toretto"
              required
              value={formData.lastName}
              onChange={handleChange}
              error={validationErrors.lastName}
            />
          </div>

          <FormInput
            label="Admin Email Address"
            type="email"
            name="email"
            id="admin-email"
            placeholder="dom@apexperformance.com"
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
            id="admin-password"
            placeholder="At least 6 characters"
            required
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            error={validationErrors.password}
            icon={<Lock className="w-4 h-4" />}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering Workshop...</span>
            </>
          ) : (
            <>
              <span>Create Workshop & Admin Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
}
