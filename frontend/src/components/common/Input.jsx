import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className = '',
    containerClassName = '',
    id,
    required = false,
    disabled = false,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={clsx('w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-brand-text mb-1.5"
        >
          {label}
          {required && <span className="text-brand-danger ml-0.5">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-subtle">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={clsx(
            'w-full rounded-xl bg-white text-sm text-brand-text placeholder-slate-400 transition-colors duration-150',
            'border focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            error
              ? 'border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20'
              : 'border-brand-border focus:border-brand-blue focus:ring-brand-blue/20 hover:border-slate-300',
            LeftIcon ? 'pl-10' : 'pl-3.5',
            RightIcon || error ? 'pr-10' : 'pr-3.5',
            'py-2.5',
            className
          )}
          {...props}
        />

        {error ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-brand-danger">
            <AlertCircle className="w-4 h-4" />
          </div>
        ) : RightIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
            <RightIcon className="w-4 h-4" />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-brand-danger flex items-center gap-1 font-medium">
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-brand-text-secondary">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
