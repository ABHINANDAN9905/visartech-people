import React from 'react';
import clsx from 'clsx';

export default function Card({ 
  children, 
  className = '', 
  hoverable = false, 
  onClick,
  ...props 
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl border border-brand-border shadow-card transition-all duration-200',
        hoverable && 'hover:shadow-md hover:border-slate-300 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ 
  children, 
  className = '', 
  action,
  ...props 
}) {
  return (
    <div
      className={clsx(
        'px-6 py-5 border-b border-brand-border/80 flex items-center justify-between gap-4',
        className
      )}
      {...props}
    >
      <div className="space-y-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardTitle({ 
  children, 
  className = '', 
  ...props 
}) {
  return (
    <h3
      className={clsx('text-base font-bold text-brand-navy tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ 
  children, 
  className = '', 
  ...props 
}) {
  return (
    <p
      className={clsx('text-xs text-brand-text-secondary leading-normal', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardBody({ 
  children, 
  className = '', 
  ...props 
}) {
  return (
    <div className={clsx('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ 
  children, 
  className = '', 
  ...props 
}) {
  return (
    <div
      className={clsx(
        'px-6 py-4 bg-slate-50/50 rounded-b-2xl border-t border-brand-border/80 flex items-center justify-between gap-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
