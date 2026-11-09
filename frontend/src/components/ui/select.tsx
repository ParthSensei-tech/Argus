import React from 'react';

interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder,
      className = '',
      id,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-purple-200"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            'block w-full rounded-lg border px-3 py-2 text-xs text-white shadow-sm transition-all appearance-none',
            'bg-purple-950/60 border-purple-800/60 hover:border-purple-700',
            'focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400',
            'disabled:cursor-not-allowed disabled:bg-purple-950/30 disabled:text-purple-500',
            error
              ? 'border-red-400 focus:ring-red-400'
              : '',
            className,
          ].join(' ')}
          aria-invalid={error ? 'true' : undefined}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23f59e0b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '2.5rem',
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-[#160C2A] text-purple-300">
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[#160C2A] text-white">
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-[11px] text-purple-300/60">{hint}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
