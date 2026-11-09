import React from 'react';

type BadgeVariant =
  | 'default'
  | 'destructive'
  | 'warning'
  | 'success'
  | 'secondary'
  | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm',
  destructive:
    'bg-red-500/20 text-red-300 border-red-500/40',
  warning:
    'bg-amber-500/20 text-amber-300 border-amber-500/40',
  success:
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  secondary:
    'bg-purple-900/50 text-purple-200 border-purple-700/50',
  outline:
    'bg-transparent text-purple-200 border-purple-700/60',
};

export function Badge({
  variant = 'default',
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
