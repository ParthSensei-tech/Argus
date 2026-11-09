import React from 'react';

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-gray-200 bg-white shadow-sm',
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
      className={['text-lg font-semibold leading-none tracking-tight text-gray-900', className].join(
        ' '
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

// ─── CardDescription ──────────────────────────────────────────────────────────

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({
  className = '',
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={['text-sm text-gray-500', className].join(' ')}
      {...props}
    >
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
      className={['flex items-center p-6 pt-0', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
