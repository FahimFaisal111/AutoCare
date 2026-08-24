import React, { forwardRef } from "react";
import { clsx } from "clsx";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, icon, id, className, required, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between"
          >
            <span>
              {label} {required && <span className="text-red-400">*</span>}
            </span>
          </label>
        )}


        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-zinc-500 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={clsx(
              "w-full rounded-lg bg-zinc-900/80 border text-sm text-zinc-100 placeholder:text-zinc-600 transition-all duration-150 outline-none",
              "py-2.5",
              icon ? "pl-10 pr-3.5" : "px-3.5",
              error
                ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-zinc-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 hover:border-zinc-700",
              className
            )}
            {...props}
          />
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-400 font-medium">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-zinc-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";
