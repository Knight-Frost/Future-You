'use client';

import { cn } from '@/lib/utils';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  rangeLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 10,
  onChange,
  formatValue,
  rangeLabel,
  className,
  disabled,
}: SliderProps) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const isActive = value > min;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#334155]">{label}</span>
        <span
          className={cn(
            'text-sm font-bold tabular-nums px-3 py-1 rounded-lg transition-all',
            isActive
              ? 'text-[#2563EB] bg-[#EFF6FF] border border-[rgba(37,99,235,0.15)]'
              : 'text-[#94A3B8] bg-[#F8FAFF] border border-transparent'
          )}
        >
          {formatValue(value)}
        </span>
      </div>

      <div className="relative py-1">
        {/* Track background */}
        <div className="absolute inset-y-0 left-0 w-full flex items-center pointer-events-none">
          <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${pct}%`,
                background: isActive
                  ? 'linear-gradient(90deg, #60A5FA, #2563EB)'
                  : 'transparent',
              }}
            />
          </div>
        </div>
        <input
          type="range"
          className="premium-slider relative z-10"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ background: 'transparent' }}
        />
      </div>

      {rangeLabel && (
        <div className="flex justify-between text-xs text-[#94A3B8]">
          <span>{formatValue(min)}</span>
          <span className="text-[#CBD5E1]">{rangeLabel}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}
    </div>
  );
}
