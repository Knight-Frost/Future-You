'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { formatCurrency, formatMonths, formatPercent, cn } from '@/lib/utils';
import type { Goal } from '@prisma/client';

// ─── Goal type config ─────────────────────────────────────────────────────────
const GOAL_TYPES: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}> = {
  EMERGENCY_FUND: {
    label: 'Emergency Fund',
    color: 'var(--primary)',
    bg:    'var(--primary-subtle)',
    border:'rgba(22,163,74,0.20)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  DEBT_PAYOFF: {
    label: 'Debt Payoff',
    color: 'var(--warning)',
    bg:    'var(--warning-bg)',
    border:'var(--warning-border)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  HOME_PURCHASE: {
    label: 'Home Purchase',
    color: '#7c3aed',
    bg:    '#f5f3ff',
    border:'#ddd6fe',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  INVESTMENT: {
    label: 'Investment Growth',
    color: 'var(--success)',
    bg:    'var(--success-bg)',
    border:'var(--success-border)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  TRAVEL: {
    label: 'Travel',
    color: 'var(--info)',
    bg:    'var(--info-bg)',
    border:'var(--info-border)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5c-1.5-1.5-3.5-1.5-5 0L11 6 2.8 4.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 1.5 1.5 1.5 1.5L7 19l1-1v-3l3-2 4.8 6.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z" />
      </svg>
    ),
  },
  EDUCATION: {
    label: 'Education',
    color: '#0891b2',
    bg:    '#ecfeff',
    border:'#a5f3fc',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  RETIREMENT: {
    label: 'Retirement',
    color: 'var(--success)',
    bg:    'var(--success-bg)',
    border:'var(--success-border)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  CUSTOM: {
    label: 'Custom Goal',
    color: 'var(--muted-foreground)',
    bg:    'var(--muted)',
    border:'var(--border)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
};

// ─── Progress bar ─────────────────────────────────────────────────────────────
function GoalProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      className="w-full h-2 rounded-full overflow-hidden"
      style={{ background: 'var(--muted)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

// ─── Inline deposit / correction form ────────────────────────────────────────
// Two modes:
//   'add'   — enter an amount to add to the running total (default)
//   'set'   — directly set the running total (correction)
function LogDepositForm({
  goal,
  onSave,
  onCancel,
}: {
  goal: Goal;
  onSave: (newTotal: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [mode,   setMode]   = useState<'add' | 'set'>('add');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const parsed   = parseFloat(amount);
  const isValid  = !isNaN(parsed) && parsed >= 0;
  const newTotal = mode === 'add'
    ? goal.currentAmount + (isValid ? parsed : 0)
    : (isValid ? parsed : goal.currentAmount);
  const wouldComplete = newTotal >= goal.targetAmount;

  // Reset input when switching modes
  function switchMode(next: 'add' | 'set') {
    setMode(next);
    setAmount(next === 'set' ? String(goal.currentAmount) : '');
    setError('');
  }

  async function handleSave() {
    if (!isValid) return;
    if (mode === 'add' && parsed === 0) return;
    setSaving(true);
    setError('');
    try {
      await onSave(newTotal);
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-xl p-4 mt-4 space-y-3"
      style={{
        background: 'var(--primary-subtle)',
        border: '1px solid rgba(22,163,74,0.18)',
        animation: 'pageIn 120ms ease-out backwards',
      }}
    >
      {/* Mode tabs */}
      <div className="flex items-center gap-1">
        {(['add', 'set'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: mode === m ? 'var(--primary)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--primary)',
            }}
          >
            {m === 'add' ? '+ Add funds' : '✎ Correct total'}
          </button>
        ))}
        <span className="text-[10px] ml-auto" style={{ color: 'var(--primary)', opacity: 0.6 }}>
          Current: {formatCurrency(goal.currentAmount)}
        </span>
      </div>

      {/* Helper text */}
      <p className="text-[11px]" style={{ color: 'var(--primary)', opacity: 0.75 }}>
        {mode === 'add'
          ? 'Enter the amount you deposited.'
          : 'Set the exact total saved so far — use this to fix a mistake.'}
      </p>

      {/* Input row */}
      <div className="flex items-stretch gap-2">
        <span
          className="px-3 flex items-center text-sm font-semibold rounded-l-xl shrink-0"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRight: 'none',
            color: 'var(--muted-foreground)',
          }}
        >
          $
        </span>
        <input
          type="number"
          min="0"
          placeholder={mode === 'add' ? '500' : String(goal.currentAmount)}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          className="field-input flex-1 rounded-none"
          style={{ borderRadius: 0 }}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={!isValid || saving || (mode === 'add' && parsed === 0)}
          className="btn btn-primary btn-sm shrink-0"
          style={{ borderRadius: '0 12px 12px 0' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="btn btn-secondary btn-sm shrink-0"
          style={{ borderRadius: 12 }}
        >
          Cancel
        </button>
      </div>

      {/* Live preview */}
      {isValid && amount !== '' && (
        <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
          {mode === 'add'
            ? `New total: ${formatCurrency(newTotal)} of ${formatCurrency(goal.targetAmount)}`
            : `Total will be set to: ${formatCurrency(newTotal)} of ${formatCurrency(goal.targetAmount)}`}
          {wouldComplete && ' — this completes the goal! 🎉'}
        </p>
      )}
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

// ─── Goal card ────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  isPrimary,
  surplus,
  onUpdate,
  onDelete,
}: {
  goal: Goal;
  isPrimary: boolean;
  surplus: number;
  onUpdate: (updated: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const [showDeposit, setShowDeposit] = useState(false);
  const [deleting, setDeleting]       = useState(false);

  const tc       = GOAL_TYPES[goal.type] ?? GOAL_TYPES.CUSTOM;
  const progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const monthsToGoal = surplus > 0 && remaining > 0 ? Math.ceil(remaining / surplus) : Infinity;
  const isComplete = goal.status === 'COMPLETED' || goal.currentAmount >= goal.targetAmount;

  const progressColor = isComplete
    ? 'var(--success)'
    : progress >= 50
    ? 'var(--primary)'
    : 'var(--warning)';

  async function handleDeposit(newTotal: number) {
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentAmount: newTotal }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    onUpdate(data.data);
    setShowDeposit(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' });
      onDelete(goal.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--surface-primary-bg)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: isPrimary
          ? `1.5px solid ${tc.color}`
          : '1px solid var(--surface-primary-border)',
        boxShadow: isPrimary ? 'var(--shadow-card-prominent)' : 'var(--shadow-card)',
      }}
    >
      {/* ── Colored top bar for primary ── */}
      {isPrimary && (
        <div className="h-1 w-full" style={{ background: tc.color }} />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Type icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
            >
              {tc.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-headline)', fontSize: '1rem', letterSpacing: '-0.01em' }}>
                  {goal.title}
                </h3>
                {isPrimary && (
                  <span className="chip chip-primary text-[10px]">Primary</span>
                )}
                {isComplete && (
                  <span className="chip chip-success text-[10px]">Completed</span>
                )}
                {goal.status === 'PAUSED' && (
                  <span className="chip chip-neutral text-[10px]">Paused</span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {tc.label}
              </p>
            </div>
          </div>

          {/* Target + actions */}
          <div className="flex items-start gap-2 shrink-0">
            <div className="text-right">
              <p
                className="font-bold tabular-nums leading-none"
                style={{ fontFamily: 'var(--font-headline)', fontSize: '1.25rem', letterSpacing: '-0.025em', color: 'var(--foreground)' }}
              >
                {formatCurrency(goal.targetAmount)}
              </p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                target
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
              aria-label="Delete goal"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress section */}
        <div className="space-y-2.5 mb-4">
          {/* Saved / remaining */}
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--muted-foreground)' }}>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                {formatCurrency(goal.currentAmount)}
              </span>{' '}
              saved
            </span>
            {remaining > 0 ? (
              <span style={{ color: 'var(--muted-foreground)' }}>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                  {formatCurrency(remaining)}
                </span>{' '}
                to go
              </span>
            ) : (
              <span className="font-semibold" style={{ color: 'var(--success)' }}>Goal reached!</span>
            )}
          </div>

          {/* Progress bar */}
          <GoalProgressBar pct={progress} color={progressColor} />

          {/* % + timeline */}
          <div className="flex justify-between text-[10px]">
            <span className="font-bold" style={{ color: progressColor }}>
              {progress.toFixed(0)}%
            </span>
            <span style={{ color: 'var(--muted-foreground)' }}>
              {goal.targetMonths
                ? `Target: ${formatMonths(goal.targetMonths)}`
                : isFinite(monthsToGoal)
                ? `Est. ${formatMonths(monthsToGoal)} at current pace`
                : 'Set a savings amount to see estimate'}
            </span>
          </div>
        </div>

        {/* Status banner */}
        {!isComplete && goal.targetMonths && isFinite(monthsToGoal) && (() => {
          const onTrack = monthsToGoal <= goal.targetMonths;
          return (
            <div
              className="rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 mb-4"
              style={{
                background: onTrack ? 'var(--success-bg)' : 'var(--warning-bg)',
                border: `1px solid ${onTrack ? 'var(--success-border)' : 'var(--warning-border)'}`,
                color: onTrack ? '#065F46' : '#92400E',
              }}
            >
              {onTrack ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  On track — you'll reach this goal{' '}
                  <strong>{formatMonths(goal.targetMonths - monthsToGoal)}</strong> early.
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Currently{' '}
                  <strong>{formatMonths(monthsToGoal - goal.targetMonths)}</strong> behind.{' '}
                  <Link href="/simulator" className="underline font-semibold">Test scenarios →</Link>
                </>
              )}
            </div>
          );
        })()}

        {/* Actions row */}
        {!isComplete && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeposit((v) => !v)}
              className="btn btn-primary btn-sm flex items-center gap-1.5 flex-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log deposit
            </button>
            <Link
              href="/simulator"
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Simulate
            </Link>
          </div>
        )}

        {/* Inline deposit form */}
        {showDeposit && (
          <LogDepositForm
            goal={goal}
            onSave={handleDeposit}
            onCancel={() => setShowDeposit(false)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Add goal modal ───────────────────────────────────────────────────────────
function AddGoalModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (goal: Goal) => void;
}) {
  const [title,    setTitle]    = useState('');
  const [type,     setType]     = useState('EMERGENCY_FUND');
  const [amount,   setAmount]   = useState('');
  const [months,   setMonths]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function handleAdd() {
    if (!title || !amount) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          targetAmount: parseFloat(amount),
          targetMonths: months ? parseInt(months) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save goal.');
        return;
      }
      onAdd(data.data);
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          animation: 'pageIn 160ms ease-out backwards',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--primary)', letterSpacing: '0.12em' }}
            >
              New goal
            </p>
            <h3 className="heading-section">What are you saving for?</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Goal type grid */}
        <div className="mb-4">
          <p className="field-label mb-2">Goal type</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(GOAL_TYPES).map(([key, tc]) => {
              const selected = type === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setType(key);
                    if (!title) setTitle(tc.label);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-center transition-all"
                  style={{
                    background: selected ? tc.bg : 'var(--muted)',
                    border: selected ? `1.5px solid ${tc.color}` : '1.5px solid transparent',
                    color: selected ? tc.color : 'var(--muted-foreground)',
                  }}
                >
                  <span>{tc.icon}</span>
                  <span style={{ fontSize: '9px', fontWeight: 600, lineHeight: 1.2 }}>
                    {tc.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Goal name */}
        <div className="mb-3">
          <label className="field-label">Goal name</label>
          <input
            type="text"
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Emergency Fund"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Target amount */}
          <div>
            <label className="field-label">Target amount</label>
            <div className="flex items-stretch">
              <span
                className="px-3 flex items-center text-sm font-semibold rounded-l-xl"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRight: 'none', color: 'var(--muted-foreground)' }}
              >
                $
              </span>
              <input
                type="number"
                className="field-input rounded-l-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15,000"
              />
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label className="field-label">Timeline (optional)</label>
            <div className="flex items-stretch">
              <input
                type="number"
                className="field-input rounded-r-none"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="24"
              />
              <span
                className="px-3 flex items-center text-sm rounded-r-xl shrink-0"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderLeft: 'none', color: 'var(--muted-foreground)' }}
              >
                mo
              </span>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        <div className="flex gap-3">
          <button
            className="btn btn-primary flex-1"
            onClick={handleAdd}
            disabled={saving || !title || !amount}
          >
            {saving ? 'Adding…' : 'Add goal'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
interface Props {
  goals: Goal[];
}

export function GoalsClient({ goals: initialGoals }: Props) {
  const [goals,    setGoals]    = useState(initialGoals);
  const [showForm, setShowForm] = useState(false);
  const { inputs, projection } = useFinancialStore();

  // Available monthly surplus after all obligations (debt + investments already deducted in netSurplus)
  const surplus = Math.max(0, projection.netSurplus);

  const savingsLabel =
    projection.savingsRate >= 0.25 ? 'Excellent' :
    projection.savingsRate >= 0.20 ? 'Great' :
    projection.savingsRate >= 0.15 ? 'Good' :
    projection.savingsRate >= 0.08 ? 'Below target' : 'Low — prioritize this';

  const savingsLabelColor =
    projection.savingsRate >= 0.20 ? 'var(--success)' :
    projection.savingsRate >= 0.10 ? 'var(--warning)' : 'var(--danger)';

  const savingsPct = Math.min(100, (projection.savingsRate / 0.25) * 100);

  const savingsBarColor =
    projection.savingsRate >= 0.20 ? 'var(--success)' :
    projection.savingsRate >= 0.10 ? 'var(--warning)' : 'var(--danger)';

  return (
    <>
      <div className="space-y-7" style={{ animation: 'pageIn 160ms ease-out backwards' }}>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5"
              style={{ color: 'var(--primary)' }}
            >
              Planning
            </p>
            <h1 className="heading-page mb-1.5">Goals</h1>
            <p className="body-sm">Define what you're building toward and track your progress.</p>
          </div>
          <button
            className="btn btn-primary btn-sm flex items-center gap-1.5 mt-1"
            onClick={() => setShowForm(true)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add goal
          </button>
        </div>

        {/* ── Goals list ────────────────────────────────────────────────────── */}
        {goals.length === 0 ? (
          <div
            className="rounded-2xl p-14 text-center"
            style={{
              background: 'var(--surface-primary-bg)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--surface-primary-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <h3 className="heading-section mb-2">No goals yet</h3>
            <p className="body-sm mb-6 max-w-sm mx-auto">
              Set your first financial goal to give your strategy a clear target. Future You will calculate your path automatically.
            </p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Set your first goal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isPrimary={i === 0}
                surplus={surplus}
                onUpdate={(updated) =>
                  setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
                }
                onDelete={(id) =>
                  setGoals((prev) => prev.filter((g) => g.id !== id))
                }
              />
            ))}
          </div>
        )}

        {/* ── Savings rate card ─────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--surface-primary-bg)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--surface-primary-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Section label + tooltip */}
          <div className="flex items-center justify-between mb-1">
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--primary)', letterSpacing: '0.12em' }}
            >
              Savings rate
            </p>
            <div className="group relative">
              <span
                className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center cursor-help"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >?</span>
              <div
                className="absolute right-0 top-7 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150"
                style={{
                  width: 240,
                  background: '#f0fdf4',
                  border: '1px solid rgba(22,163,74,0.2)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  zIndex: 9999,
                  boxShadow: '0 8px 28px rgba(22,163,74,0.15), 0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', color: 'rgba(21,128,61,0.5)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                  How it&apos;s calculated
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'Income',         value: formatCurrency(inputs.monthlyIncome) },
                    { op: '−', label: 'Expenses', value: formatCurrency(inputs.monthlyExpenses) },
                    { op: '÷', label: 'Income',   value: formatCurrency(inputs.monthlyIncome) },
                    { op: '=', label: 'Savings rate', value: formatPercent(projection.savingsRate), result: true },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: '0.73rem', color: row.result ? '#15803d' : '#166534', fontWeight: row.result ? 700 : 400 }}>
                        {row.op && <span style={{ color: 'rgba(21,128,61,0.4)', marginRight: 4 }}>{row.op}</span>}
                        {row.label}
                      </span>
                      <span style={{ fontSize: '0.73rem', fontFamily: 'monospace', color: row.result ? '#15803d' : '#14532d', fontWeight: row.result ? 700 : 500, whiteSpace: 'nowrap' }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.66rem', color: 'rgba(21,128,61,0.5)', marginTop: 8, borderTop: '1px solid rgba(22,163,74,0.15)', paddingTop: 6, lineHeight: 1.4 }}>
                  Target: 15–20% healthy · 25%+ excellent
                </p>
              </div>
            </div>
          </div>

          {/* Big number */}
          <div className="flex items-end gap-3 mb-4 mt-1">
            <p
              className="metric-value-lg"
              style={{ color: 'var(--foreground)' }}
            >
              {formatPercent(projection.savingsRate)}
            </p>
            <p
              className="font-bold mb-1.5 text-sm"
              style={{ color: savingsLabelColor }}
            >
              {savingsLabel}
            </p>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-2 rounded-full mb-3"
            style={{ background: 'var(--muted)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${savingsPct}%`, background: savingsBarColor }}
            />
          </div>

          {/* Benchmark labels */}
          <div className="flex justify-between text-[10px] font-semibold">
            <span style={{ color: 'var(--muted-foreground)' }}>0%</span>
            <span style={{ color: 'var(--warning)' }}>10% min</span>
            <span style={{ color: 'var(--primary)' }}>20% target</span>
            <span style={{ color: 'var(--success)' }}>25%+</span>
          </div>

          {/* Link to improve */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Link
              href="/plan"
              className="text-xs font-semibold flex items-center gap-1.5"
              style={{ color: 'var(--primary)', textDecoration: 'none' }}
            >
              Adjust income or expenses in the Plan to improve your rate
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>

      </div>

      {/* ── Add goal modal (portal-style overlay) ──────────────────────────── */}
      {showForm && (
        <AddGoalModal
          onClose={() => setShowForm(false)}
          onAdd={(goal) => setGoals((g) => [...g, goal])}
        />
      )}
    </>
  );
}
