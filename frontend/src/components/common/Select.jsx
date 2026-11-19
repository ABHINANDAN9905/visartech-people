import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { ChevronDown, AlertCircle } from 'lucide-react';

const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    placeholder = 'Select an option',
    className = '',
    containerClassName = '',
    id,
    required = false,
    disabled = false,
    children,
    value,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={clsx('w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-brand-text mb-1.5"
        >
          {label}
          {required && <span className="text-brand-danger ml-0.5">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-subtle">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          value={value}
          className={clsx(
            'w-full appearance-none rounded-xl bg-white text-sm text-brand-text transition-colors duration-150',
            'border focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            error
              ? 'border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20'
              : 'border-brand-border focus:border-brand-blue focus:ring-brand-blue/20 hover:border-slate-300',
            'pl-3.5 pr-10 py-2.5',
            !value && 'text-slate-400',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-slate-400">
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => {
                const optValue = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                return (
                  <option key={optValue} value={optValue} className="text-brand-text">
                    {optLabel}
                  </option>
                );
              })
            : children}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-brand-danger flex items-center gap-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-brand-text-secondary">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
