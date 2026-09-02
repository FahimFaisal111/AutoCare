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
            className="text-xs font-semibold text-[#0a2540] flex items-center justify-between"
          >
            <span>
              {label} {required && <span className="text-[#635bff]">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
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
              "w-full rounded-lg bg-white border text-sm text-[#0a2540] placeholder-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-all py-2.5",
              icon ? "pl-10 pr-3.5" : "px-3.5",
              error
                ? "border-red-400 focus:ring-2 focus:ring-red-400/30 focus:border-red-400"
                : "border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-[#635bff]/30 focus:border-[#635bff]",
              className
            )}
            {...props}
          />
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-500 font-medium">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";
