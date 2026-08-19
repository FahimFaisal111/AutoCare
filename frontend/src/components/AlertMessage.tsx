import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

interface AlertMessageProps {
  type: "error" | "success";
  message: string;
  className?: string;
}

export function AlertMessage({ type, message, className }: AlertMessageProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={clsx(
        "flex items-start gap-3 p-3.5 rounded-lg text-sm border transition-all duration-200",
        type === "error" && "bg-red-950/40 border-red-900/50 text-red-200",
        type === "success" && "bg-emerald-950/40 border-emerald-900/50 text-emerald-200",
        className
      )}
    >
      {type === "error" ? (
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 leading-snug">{message}</div>
    </div>
  );
}
