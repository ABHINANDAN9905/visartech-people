import React from 'react';
import clsx from 'clsx';

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '' 
}) {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5 border-[2px]',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-[2.5px]',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    primary: 'border-brand-blue/20 border-t-brand-blue',
    white: 'border-white/30 border-t-white',
    navy: 'border-brand-navy/20 border-t-brand-navy',
    slate: 'border-slate-300 border-t-slate-600',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx(
        'rounded-full animate-spin inline-block',
        sizeClasses[size] || sizeClasses.md,
        colorClasses[color] || colorClasses.primary,
        className
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
