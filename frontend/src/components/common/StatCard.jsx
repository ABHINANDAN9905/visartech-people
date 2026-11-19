import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendType = 'up', // 'up' | 'down' | 'neutral'
  description,
  badge,
  iconColor = 'blue', // 'blue' | 'navy' | 'emerald' | 'amber' | 'rose'
  className = '',
}) {
  const iconBgClasses = {
    blue: 'bg-brand-blue-light text-brand-blue border-brand-blue/20',
    navy: 'bg-brand-navy/10 text-brand-navy border-brand-navy/20',
    emerald: 'bg-brand-success-light text-brand-success border-brand-success/20',
    amber: 'bg-brand-warning-light text-brand-warning border-brand-warning/30',
    rose: 'bg-brand-danger-light text-brand-danger border-brand-danger/20',
  };

  const trendTextClasses = {
    up: 'text-brand-success bg-brand-success-light border-brand-success/20',
    down: 'text-brand-danger bg-brand-danger-light border-brand-danger/20',
    neutral: 'text-slate-600 bg-slate-100 border-slate-200',
  };

  const TrendIcon = trendType === 'up' ? TrendingUp : trendType === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl p-5 sm:p-6 border border-brand-border shadow-card transition-all duration-200 hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <span className="text-xs font-semibold text-brand-text-secondary tracking-wide uppercase">
          {title}
        </span>
        {Icon && (
          <div
            className={clsx(
              'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-subtle',
              iconBgClasses[iconColor] || iconBgClasses.blue
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">
          {value}
        </div>
        {badge && <div>{badge}</div>}
      </div>

      {(trend || description) && (
        <div className="mt-3 pt-3 border-t border-brand-border/60 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold border text-[11px]',
                trendTextClasses[trendType] || trendTextClasses.neutral
              )}
            >
              <TrendIcon className="w-3 h-3" />
              <span>{trend}</span>
            </span>
          )}
          {description && (
            <span className="text-brand-text-secondary truncate">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
