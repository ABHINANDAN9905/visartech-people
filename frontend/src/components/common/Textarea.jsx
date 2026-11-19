import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    className = '',
    containerClassName = '',
    id,
    rows = 4,
    required = false,
    disabled = false,
    ...props
  },
  ref
) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={clsx('w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold text-brand-text mb-1.5"
        >
          {label}
          {required && <span className="text-brand-danger ml-0.5">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-subtle">
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          className={clsx(
            'w-full rounded-xl bg-white text-sm text-brand-text placeholder-slate-400 transition-colors duration-150',
            'border focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            error
              ? 'border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20'
              : 'border-brand-border focus:border-brand-blue focus:ring-brand-blue/20 hover:border-slate-300',
            'p-3.5',
            className
          )}
          {...props}
        />
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

export default Textarea;
