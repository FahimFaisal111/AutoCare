"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { User, Mail, Lock, Key, Phone, Loader2, ArrowRight } from "lucide-react";
import { ApiError } from "@/lib/api";

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
      subtitle="Register with your workshop's unique access code"
      footer={
        <p>
          Already have an account?{" "}
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

        <FormInput
          label="Workshop Access Code"
          name="workshopAccessCode"
          id="cust-access-code"
          placeholder="e.g. DT-CARE-2026"
          required
          value={formData.workshopAccessCode}
          onChange={handleChange}
          error={validationErrors.workshopAccessCode}
          helperText="Ask your workshop manager for their unique tenant access code"
          icon={<Key className="w-4 h-4" />}
        />

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
          className="w-full mt-3 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
