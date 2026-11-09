import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-purple-200"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'block w-full rounded-lg border px-3 py-2 text-xs text-white placeholder-purple-400/40 shadow-sm transition-all',
            'bg-purple-950/60 border-purple-800/60 hover:border-purple-700',
            'focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400',
            'disabled:cursor-not-allowed disabled:bg-purple-950/30 disabled:text-purple-500',
            error
              ? 'border-red-400 focus:ring-red-400'
              : '',
            className,
          ].join(' ')}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-[11px] text-purple-300/60">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
