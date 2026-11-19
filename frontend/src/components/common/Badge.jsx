import React from 'react';
import clsx from 'clsx';

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  const variantStyles = {
    success: 'bg-brand-success-light text-brand-success border-brand-success/20',
    pending: 'bg-brand-warning-light text-brand-warning border-brand-warning/30',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-brand-danger-light text-brand-danger border-brand-danger/20',
    danger: 'bg-brand-danger-light text-brand-danger border-brand-danger/20',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    info: 'bg-brand-blue-light text-brand-blue border-brand-blue/20',
    navy: 'bg-brand-navy/10 text-brand-navy border-brand-navy/20',
  };

  const dotColors = {
    success: 'bg-brand-success',
    pending: 'bg-brand-warning',
    warning: 'bg-amber-500',
    rejected: 'bg-brand-danger',
    danger: 'bg-brand-danger',
    neutral: 'bg-slate-400',
    info: 'bg-brand-blue',
    navy: 'bg-brand-navy',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold rounded-full border leading-none select-none tracking-tight',
        variantStyles[variant] || variantStyles.neutral,
        sizeStyles[size] || sizeStyles.md,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx(
            'rounded-full shrink-0',
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
            dotColors[variant] || dotColors.neutral
          )}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
