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
      <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle top edge highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">{title}</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">{subtitle}</p>
        </div>

        {/* Body Content */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        {footer && <div className="mt-6 pt-5 border-t border-zinc-900 text-center text-xs text-zinc-500">{footer}</div>}
      </div>
    </div>
  );
}
