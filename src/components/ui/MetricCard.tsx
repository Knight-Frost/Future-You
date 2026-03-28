'use client';

import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  tooltip?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  accent?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
}

const accentConfig = {
  default: {
    iconBox: 'icon-box-blue',
    valueColor: 'text-[#0F172A]',
  },
  success: {
    iconBox: 'icon-box-green',
    valueColor: 'text-[#059669]',
  },
  warning: {
    iconBox: 'icon-box-amber',
    valueColor: 'text-[#D97706]',
  },
  danger: {
    iconBox: 'icon-box-red',
    valueColor: 'text-[#DC2626]',
  },
  info: {
    iconBox: 'icon-box-blue',
    valueColor: 'text-[#0EA5E9]',
  },
};

const valueSizes = {
  sm: 'metric-value-sm',
  md: 'metric-value',
  lg: 'metric-value-lg',
};

export function MetricCard({
  label,
  value,
  sub,
  tooltip,
  trend,
  trendLabel,
  accent = 'default',
  size = 'md',
  className,
  icon,
}: MetricCardProps) {
  const config = accentConfig[accent];

  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className={cn('icon-box icon-box-sm', config.iconBox)}>
              {icon}
            </div>
          )}
          <span className="label-caps">{label}</span>
        </div>
        {tooltip && (
          <div className="tooltip-container">
            <span className="tooltip-trigger">?</span>
            <div className="tooltip-bubble">{tooltip}</div>
          </div>
        )}
      </div>

      <div className={cn(valueSizes[size], 'mb-1', !icon && config.valueColor)}>{value}</div>

      {sub && <p className="caption mt-1">{sub}</p>}

      {trend && trendLabel && (
        <div className={cn(
          'flex items-center gap-1 mt-2 text-xs font-bold',
          trend === 'up' ? 'text-[#059669]' : trend === 'down' ? 'text-[#DC2626]' : 'text-[#64748B]'
        )}>
          <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
