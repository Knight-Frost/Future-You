'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, prefix, suffix, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] text-sm font-semibold pointer-events-none select-none z-10">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'field-input',
              prefix && '!pl-8',
              suffix && '!pr-12',
              error && 'error',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] text-sm font-medium pointer-events-none select-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="field-error">{error}</p>}
        {hint && !error && <p className="caption">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
