import React from "react";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#635bff]/10 text-[#635bff] font-bold text-lg mb-1">
            ⚡
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a2540]">{title}</h1>
          <p className="text-sm text-gray-600 leading-relaxed">{subtitle}</p>
        </div>

        {/* Form Body */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
