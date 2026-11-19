import React from 'react';
import clsx from 'clsx';

export default function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  className = '',
}) {
  return (
    <div className={clsx('pb-6 mb-6 border-b border-brand-border/80', className)}>
      {breadcrumbs && (
        <div className="flex items-center gap-2 text-xs text-brand-text-secondary mb-2">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300">/</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="hover:text-brand-blue transition-colors font-medium"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-brand-text font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-brand-text-secondary">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
