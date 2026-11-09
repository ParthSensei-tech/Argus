import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-medium text-purple-200"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={[
            'block w-full rounded-lg border px-3 py-2 text-xs text-white placeholder-purple-400/40 shadow-sm transition-all resize-y min-h-[80px]',
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
            error
              ? `${textareaId}-error`
              : hint
              ? `${textareaId}-hint`
              : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-[11px] text-purple-300/60">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
