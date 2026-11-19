import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export default function Dropdown({
  trigger,
  children,
  items = [],
  align = 'right',
  className = '',
  menuClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignClasses = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
  };

  return (
    <div ref={dropdownRef} className={clsx('relative inline-block text-left', className)}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={clsx(
            'absolute z-50 mt-2 w-56 rounded-xl bg-white p-1.5 shadow-dropdown border border-brand-border focus:outline-none transition-all duration-150',
            alignClasses[align] || alignClasses.right,
            menuClassName
          )}
        >
          {items.length > 0
            ? items.map((item, idx) => {
                if (item.type === 'separator') {
                  return <hr key={idx} className="my-1 border-brand-border/80" />;
                }
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      setIsOpen(false);
                    }}
                    disabled={item.disabled}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors',
                      item.danger
                        ? 'text-brand-danger hover:bg-brand-danger-light'
                        : 'text-brand-text hover:bg-slate-100 hover:text-brand-navy',
                      item.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-brand-navy" />}
                    <span className="flex-1">{item.label}</span>
                    {item.badge && <span className="text-[10px]">{item.badge}</span>}
                  </button>
                );
              })
            : typeof children === 'function'
            ? children({ close: () => setIsOpen(false) })
            : children}
        </div>
      )}
    </div>
  );
}
