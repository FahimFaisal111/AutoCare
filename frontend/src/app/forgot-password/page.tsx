"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { AlertMessage } from "@/components/AlertMessage";
import { Mail, Lock, Key, Loader2, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();

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
      title="Reset Your Password"
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
          <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors">
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
            helperText="Enter the email associated with your Customer, Mechanic, or Admin account"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
        <form onSubmit={handleResetPassword} className="space-y-3.5">
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="text-xs text-zinc-300">
              <span className="text-zinc-500 block text-[11px]">Resetting password for:</span>
              <strong className="text-zinc-100">{email}</strong>
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
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-100">Password Successfully Updated</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Your password has been changed and securely encrypted in the database. You can now sign in with your new credentials.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm shadow-md transition-all duration-150 inline-flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
