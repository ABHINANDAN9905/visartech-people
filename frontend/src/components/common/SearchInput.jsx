import React from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  shortcut,
  className = '',
  containerClassName = '',
  size = 'md',
  ...props
}) {
  const sizeClasses = {
    sm: 'py-1.5 pl-8 pr-7 text-xs',
    md: 'py-2 pl-9 pr-8 text-sm',
    lg: 'py-2.5 pl-10 pr-9 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5 left-2.5',
    md: 'w-4 h-4 left-3',
    lg: 'w-4 h-4 left-3.5',
  };

  return (
    <div className={clsx('relative w-full', containerClassName)}>
      <div className={clsx('absolute inset-y-0 flex items-center pointer-events-none text-slate-400', iconSizes[size] || iconSizes.md)}>
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={clsx(
          'w-full bg-white rounded-xl border border-brand-border text-brand-text placeholder-slate-400',
          'focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 hover:border-slate-300 transition-colors shadow-subtle',
          sizeClasses[size] || sizeClasses.md,
          className
        )}
        {...props}
      />

      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Clear search</span>
        </button>
      ) : shortcut ? (
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-400">
            {shortcut}
          </kbd>
        </div>
      ) : null}
    </div>
  );
}
