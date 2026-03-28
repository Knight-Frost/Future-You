import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatMonths(months: number): string {
  if (!isFinite(months) || months <= 0) return '—';
  if (months < 1) return '<1 mo';
  if (months < 12) return `${Math.round(months)} mo`;
  let years = Math.floor(months / 12);
  let remainingMonths = Math.round(months % 12);
  if (remainingMonths === 12) { years += 1; remainingMonths = 0; }
  if (remainingMonths === 0) return `${years} yr${years !== 1 ? 's' : ''}`;
  return `${years} yr${years !== 1 ? 's' : ''} ${remainingMonths} mo`;
}

export function formatDelta(months: number): string {
  if (!isFinite(months) || months === 0) return 'No change';
  const abs = Math.abs(Math.round(months));
  if (abs < 12) return `${abs} mo ${months < 0 ? 'faster' : 'slower'}`;
  const years = Math.floor(abs / 12);
  const remainingMonths = abs % 12;
  const label = months < 0 ? 'faster' : 'slower';
  if (remainingMonths === 0) return `${years} yr${years !== 1 ? 's' : ''} ${label}`;
  return `${years} yr${years !== 1 ? 's' : ''} ${remainingMonths} mo ${label}`;
}

/**
 * Converts a month count from today into a human-readable "Month Year" string.
 * e.g. formatPayoffDate(18) → "September 2027"
 */
export function formatPayoffDate(months: number): string {
  if (!isFinite(months) || months <= 0) return '—';
  const date = new Date();
  date.setMonth(date.getMonth() + Math.ceil(months));
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getFirstName(name: string | null | undefined): string {
  if (!name) return 'there';
  return name.split(' ')[0];
}
