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
        "flex items-start gap-3 p-3.5 rounded-lg text-sm border shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-200",
        type === "error" && "bg-red-50 border-red-200 text-red-700",
        type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800",
        className
      )}
    >
      {type === "error" ? (
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
      )}
      <div className="flex-1 leading-relaxed font-medium">{message}</div>
    </div>
  );
}
