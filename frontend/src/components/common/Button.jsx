import React from 'react';
import clsx from 'clsx';
import LoadingSpinner from './LoadingSpinner';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-brand-blue text-white hover:bg-brand-blue-hover focus:ring-brand-blue shadow-sm hover:shadow',
    secondary: 'bg-white text-brand-text border border-brand-border hover:bg-slate-50 hover:border-slate-300 focus:ring-brand-navy shadow-subtle',
    outline: 'bg-transparent text-brand-blue border border-brand-blue hover:bg-brand-blue-light focus:ring-brand-blue',
    danger: 'bg-brand-danger text-white hover:bg-red-600 focus:ring-brand-danger shadow-sm',
    ghost: 'bg-transparent text-brand-text-secondary hover:text-brand-text hover:bg-slate-100 focus:ring-slate-300',
    navy: 'bg-brand-navy text-white hover:bg-brand-navy-light focus:ring-brand-navy shadow-sm',
  };

  const spinnerColor = ['primary', 'danger', 'navy'].includes(variant) ? 'white' : 'primary';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={clsx(
        baseStyles,
        sizeStyles[size] || sizeStyles.md,
        variantStyles[variant] || variantStyles.primary,
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" color={spinnerColor} />
          <span>{children}</span>
        </>
      ) : (
        <>
          {LeftIcon && <LeftIcon className={clsx('shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />}
          <span>{children}</span>
          {RightIcon && <RightIcon className={clsx('shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />}
        </>
      )}
    </button>
  );
}
