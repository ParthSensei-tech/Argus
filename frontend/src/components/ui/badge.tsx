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
    'bg-indigo-100 text-indigo-800 border-transparent',
  destructive:
    'bg-red-100 text-red-800 border-transparent',
  warning:
    'bg-amber-100 text-amber-800 border-transparent',
  success:
    'bg-green-100 text-green-800 border-transparent',
  secondary:
    'bg-gray-100 text-gray-700 border-transparent',
  outline:
    'bg-transparent text-gray-700 border-gray-300',
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
