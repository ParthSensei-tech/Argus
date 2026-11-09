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
    bg: 'bg-purple-950/60',
    border: 'border-purple-700/60',
    text: 'text-purple-200',
    icon: <Info className="h-5 w-5 text-amber-400" />,
  },
  success: {
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/40',
    text: 'text-emerald-200',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
  },
  warning: {
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/40',
    text: 'text-amber-200',
    icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
  },
  destructive: {
    bg: 'bg-red-950/60',
    border: 'border-red-500/40',
    text: 'text-red-200',
    icon: <AlertCircle className="h-5 w-5 text-red-400" />,
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
        'flex gap-3 rounded-xl border p-4 text-xs backdrop-blur-md',
        conf.bg,
        conf.border,
        conf.text,
        className,
      ].join(' ')}
      role="alert"
      {...props}
    >
      <div className="shrink-0">{conf.icon}</div>
      <div className="flex-1">
        {title && <h4 className="mb-1 font-bold text-white">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
