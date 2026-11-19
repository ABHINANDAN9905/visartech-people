import React, { useState } from 'react';
import clsx from 'clsx';

export default function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  status,
  className = '',
  ...props
}) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusSizeClasses = {
    xs: 'w-1.5 h-1.5 border',
    sm: 'w-2 h-2 border-[1.5px]',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-4 h-4 border-2',
  };

  const statusClasses = {
    online: 'bg-brand-success',
    offline: 'bg-slate-400',
    busy: 'bg-brand-danger',
    away: 'bg-brand-warning',
  };

  // Color generator for initials background
  const getBgColor = (seed) => {
    const colors = [
      'bg-blue-600 text-white',
      'bg-indigo-600 text-white',
      'bg-emerald-600 text-white',
      'bg-amber-600 text-white',
      'bg-rose-600 text-white',
      'bg-purple-600 text-white',
      'bg-cyan-600 text-white',
      'bg-[#101B35] text-white',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const showImage = src && !imageError;

  return (
    <div className={clsx('relative inline-flex shrink-0 select-none', className)} {...props}>
      {showImage ? (
        <img
          src={src}
          alt={alt || name}
          onError={() => setImageError(true)}
          className={clsx(
            'rounded-full object-cover border border-slate-200/80 shadow-subtle',
            sizeClasses[size] || sizeClasses.md
          )}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center font-bold tracking-tight shadow-subtle',
            sizeClasses[size] || sizeClasses.md,
            getBgColor(name || 'User')
          )}
        >
          {getInitials(name || alt)}
        </div>
      )}

      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-white',
            statusClasses[status] || statusClasses.online,
            statusSizeClasses[size] || statusSizeClasses.md
          )}
        />
      )}
    </div>
  );
}
