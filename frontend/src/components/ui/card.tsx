import React from 'react';

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-purple-900/40 bg-[#140B26]/85 backdrop-blur-md text-white shadow-xl shadow-purple-950/30 transition-all duration-200',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── CardHeader ───────────────────────────────────────────────────────────────

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className = '', children, ...props }: CardHeaderProps) {
  return (
    <div
      className={['flex flex-col space-y-1.5 p-6', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── CardTitle ────────────────────────────────────────────────────────────────

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className = '', children, ...props }: CardTitleProps) {
  return (
    <h3
      className={['text-lg font-bold leading-none tracking-tight text-white', className].join(
        ' '
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

// ─── CardDescription ──────────────────────────────────────────────────────────

interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({
  className = '',
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <p className={['text-xs text-purple-200/70', className].join(' ')} {...props}>
      {children}
    </p>
  );
}

// ─── CardContent ──────────────────────────────────────────────────────────────

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className = '', children, ...props }: CardContentProps) {
  return (
    <div className={['p-6 pt-0', className].join(' ')} {...props}>
      {children}
    </div>
  );
}

// ─── CardFooter ───────────────────────────────────────────────────────────────

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className = '', children, ...props }: CardFooterProps) {
  return (
    <div
      className={['flex items-center p-6 pt-0 border-t border-purple-900/30 bg-purple-950/20', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
