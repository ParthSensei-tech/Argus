import React from 'react';

type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

type ButtonSize = 'sm' | 'default' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-purple-950 font-bold hover:brightness-110 active:brightness-95 shadow-gold-sm border border-amber-400/50',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm border border-red-500/40',
  outline:
    'border border-amber-500/30 bg-purple-950/40 text-amber-300 hover:bg-amber-500/15 hover:border-amber-400/60 active:bg-amber-500/20 shadow-sm',
  secondary:
    'bg-purple-900/60 text-purple-100 hover:bg-purple-800/80 active:bg-purple-800 border border-purple-700/40',
  ghost:
    'text-purple-200/80 hover:bg-purple-900/40 hover:text-white active:bg-purple-900/60',
  link:
    'text-amber-400 underline-offset-4 hover:underline hover:text-amber-300 p-0 h-auto font-medium',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  default: 'h-10 px-4 text-xs font-semibold rounded-lg gap-2',
  lg: 'h-12 px-6 text-sm font-semibold rounded-lg gap-2',
};

export function Button({
  variant = 'default',
  size = 'default',
  isLoading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090412]',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
