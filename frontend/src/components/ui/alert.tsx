import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'destructive';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
}

const variantConfig: Record<AlertVariant, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  },
  destructive: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: <AlertCircle className="h-5 w-5 text-red-500" />,
  },
};

export function Alert({
  variant = 'info',
  title,
  children,
  className = '',
  ...props
}: AlertProps) {
  const conf = variantConfig[variant];

  return (
    <div
      className={[
        'flex items-start gap-3 rounded-lg border p-4 text-sm',
        conf.bg,
        conf.border,
        conf.text,
        className,
      ].join(' ')}
      role="alert"
      {...props}
    >
      <div className="shrink-0 mt-0.5">{conf.icon}</div>
      <div className="flex-1">
        {title && <h5 className="mb-1 font-semibold leading-none">{title}</h5>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  );
}
