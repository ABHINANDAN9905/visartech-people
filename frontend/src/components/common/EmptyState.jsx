import React from 'react';
import clsx from 'clsx';
import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There is currently no data to display for this view.',
  actionLabel,
  onAction,
  actionIcon,
  secondaryAction,
  className = '',
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-4 shadow-subtle">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-brand-navy tracking-tight mb-1.5">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-brand-text-secondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryAction) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {actionLabel && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={actionIcon}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
