"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { Mail, Lock, Loader2, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset" | "complete">("request");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Step 1: Request reset token
  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await api.forgotPassword({ email });
      setResetToken(res.resetToken);
      setSuccessMessage("Identity verified! Reset token issued (valid for 15 minutes).");
      setStep("reset");
    } catch (err: unknown) {
      const error = err as ApiError;
      setErrorMessage(error.message || "Failed to process password reset request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.resetPassword({
        resetToken,
        newPassword,
      });
      setStep("complete");
    } catch (err: unknown) {
      const error = err as ApiError;
      setErrorMessage(error.message || "Failed to reset password. The token may have expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      subtitle={
        step === "request"
          ? "Enter your account email to receive a password recovery token"
          : step === "reset"
          ? "Set a new secure password for your account"
          : "Password recovery completed successfully"
      }
      footer={
        <p>
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-[#635bff] hover:underline">
            Back to Sign In
          </Link>
        </p>
      }
    >
      {errorMessage && <AlertMessage type="error" message={errorMessage} />}
      {successMessage && <AlertMessage type="success" message={successMessage} />}

      {/* Step 1: Request Token */}
      {step === "request" && (
        <form onSubmit={handleRequestToken} className="space-y-4">
          <FormInput
            label="Registered Account Email"
            type="email"
            name="email"
            id="forgot-email"
            placeholder="name@workshop.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            icon={<Mail className="w-4 h-4" />}
            helperText="Enter the email associated with your account"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-sm shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(99,91,255,0.3),0_8px_16px_rgba(99,91,255,0.25)] active:translate-y-0 active:scale-[0.98] transition-all duration-[300ms] ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Account...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Enter New Password */}
      {step === "reset" && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#00d4ff] flex-shrink-0" />
            <div className="text-xs text-gray-700">
              <span className="text-gray-500 block text-[11px]">Resetting password for:</span>
              <strong className="text-[#0a2540]">{email}</strong>
            </div>
          </div>

          <FormInput
            label="New Password"
            type="password"
            name="newPassword"
            id="reset-new-password"
            placeholder="At least 6 characters"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            icon={<Lock className="w-4 h-4" />}
          />

          <FormInput
            label="Confirm New Password"
            type="password"
            name="confirmPassword"
            id="reset-confirm-password"
            placeholder="Re-type your new password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            icon={<Lock className="w-4 h-4" />}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-sm shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(99,91,255,0.3),0_8px_16px_rgba(99,91,255,0.25)] active:translate-y-0 active:scale-[0.98] transition-all duration-[300ms] ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Save New Password</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 3: Complete */}
      {step === "complete" && (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0a2540]">Password Successfully Updated</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
              Your password has been securely updated. You can now sign in with your new credentials.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full mt-2 py-3 px-5 rounded-lg bg-[#635bff] hover:bg-[#5349e0] text-white font-semibold text-sm shadow-[0_2px_4px_rgba(99,91,255,0.2),0_4px_8px_rgba(99,91,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(99,91,255,0.3),0_8px_16px_rgba(99,91,255,0.25)] active:translate-y-0 active:scale-[0.98] transition-all duration-[300ms] ease-out inline-flex items-center justify-center gap-2"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
