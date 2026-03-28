'use client';

import { useState } from 'react';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { FinancialProfile } from '@prisma/client';

interface Props {
  profile: FinancialProfile | null;
  user: { name: string | null; email: string } | null;
}

export function ProfileClient({ profile, user }: Props) {
  const { syncFromProfile, inputs } = useFinancialStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [income, setIncome] = useState(String(profile?.monthlyIncome ?? ''));
  const [expenses, setExpenses] = useState(String(profile?.monthlyExpenses ?? ''));
  const [savings, setSavings] = useState(String(profile?.currentSavings ?? ''));
  const [debt, setDebt] = useState(String(profile?.debtBalance ?? ''));
  const [debtPayment, setDebtPayment] = useState(String(profile?.debtMonthlyPayment ?? ''));
  const [debtRate, setDebtRate] = useState(String((profile?.debtAnnualRate ?? 0.18) * 100));
  const [investment, setInvestment] = useState(String(profile?.monthlyInvestment ?? ''));
  const [investmentBalance, setInvestmentBalance] = useState(String(profile?.investmentBalance ?? ''));

  const surplusPreview = (parseFloat(income) || 0) - (parseFloat(expenses) || 0);
  const surplusPositive = surplusPreview >= 0;

  async function handleSave() {
    setError('');
    setSaving(true);

    const payload = {
      monthlyIncome: parseFloat(income) || 0,
      monthlyExpenses: parseFloat(expenses) || 0,
      currentSavings: parseFloat(savings) || 0,
      debtBalance: parseFloat(debt) || 0,
      debtMonthlyPayment: parseFloat(debtPayment) || 0,
      debtAnnualRate: (parseFloat(debtRate) || 18) / 100,
      monthlyInvestment: parseFloat(investment) || 0,
      investmentBalance: parseFloat(investmentBalance) || 0,
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Save failed');

      syncFromProfile({ ...payload, goalName: inputs.goalName, goalAmount: inputs.goalAmount });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
      <div className="flex items-start gap-3 mb-5">
        <div className="icon-box icon-box-sm icon-box-blue shrink-0 mt-0.5">{icon}</div>
        <div>
          <h2 className="heading-section">{title}</h2>
          <p className="caption mt-0.5">{subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="heading-page mb-2">Financial Profile</h1>
        <p className="body-sm">
          Your financial baseline. All projections, recommendations, and strategies are calculated from this data.
          Keep it accurate for meaningful results.
        </p>
      </div>

      {/* Account (read-only) */}
      <div className="card p-6">
        <SectionHeader
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          title="Account"
          subtitle="Your account information — managed through your sign-in provider."
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Name</label>
            <p className="field-input bg-[#F8FAFC] cursor-not-allowed text-[#64748B] select-none">{user?.name ?? '—'}</p>
          </div>
          <div>
            <label className="field-label">Email</label>
            <p className="field-input bg-[#F8FAFC] cursor-not-allowed text-[#64748B] select-none">{user?.email ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Income & Expenses */}
      <div className="card p-6">
        <SectionHeader
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            </svg>
          }
          title="Income & Expenses"
          subtitle="Your monthly take-home income and total recurring expenses."
        />
        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Monthly income (after tax)"
            type="number"
            min="0"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            prefix="$"
            placeholder="4,500"
          />
          <Input
            label="Monthly expenses"
            type="number"
            min="0"
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
            prefix="$"
            placeholder="3,200"
            hint="All fixed and variable expenses combined"
          />
        </div>

        {income && expenses && (
          <div className="mt-4 rounded-xl p-4 flex items-center justify-between" style={{ background: surplusPositive ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${surplusPositive ? '#A7F3D0' : '#FECACA'}` }}>
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', surplusPositive ? 'bg-[#059669]' : 'bg-[#DC2626]')} />
              <span className="text-sm font-medium text-[#334155]">Monthly surplus</span>
            </div>
            <span className={cn('text-sm font-bold tabular-nums', surplusPositive ? 'text-[#059669]' : 'text-[#DC2626]')}>
              {surplusPositive ? '+' : ''}
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(surplusPreview)}
            </span>
          </div>
        )}
      </div>

      {/* Debt */}
      <div className="card p-6">
        <SectionHeader
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          title="Debt"
          subtitle="Combined debt balance, monthly payment, and interest rate. If you have multiple debts, enter the highest-rate debt first."
        />
        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Total debt balance"
            type="number"
            min="0"
            value={debt}
            onChange={(e) => setDebt(e.target.value)}
            prefix="$"
            placeholder="0"
          />
          <Input
            label="Monthly payment"
            type="number"
            min="0"
            value={debtPayment}
            onChange={(e) => setDebtPayment(e.target.value)}
            prefix="$"
            placeholder="0"
          />
          <Input
            label="Annual interest rate (APR)"
            type="number"
            min="0"
            max="100"
            value={debtRate}
            onChange={(e) => setDebtRate(e.target.value)}
            suffix="%"
            placeholder="18"
            hint="Credit card default is ~18–24%"
          />
        </div>
      </div>

      {/* Savings */}
      <div className="card p-6">
        <SectionHeader
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
          title="Savings"
          subtitle="Your current liquid savings balance, not including investments."
        />
        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Current savings balance"
            type="number"
            min="0"
            value={savings}
            onChange={(e) => setSavings(e.target.value)}
            prefix="$"
            placeholder="0"
            hint="Cash savings, checking, and money market accounts"
          />
        </div>
      </div>

      {/* Investments */}
      <div className="card p-6">
        <SectionHeader
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
          title="Investments"
          subtitle="Monthly contributions and current portfolio balance. Used for long-term projections."
        />
        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Monthly investment contribution"
            type="number"
            min="0"
            value={investment}
            onChange={(e) => setInvestment(e.target.value)}
            prefix="$"
            placeholder="0"
            hint="401k, index funds, brokerage, etc."
          />
          <Input
            label="Current investment portfolio value"
            type="number"
            min="0"
            value={investmentBalance}
            onChange={(e) => setInvestmentBalance(e.target.value)}
            prefix="$"
            placeholder="0"
            hint="Total current market value"
          />
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {saved && (
        <div className="rounded-xl px-4 py-3.5 flex items-center gap-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-sm text-[#065F46] font-semibold">Profile saved — all projections have been updated.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="caption text-[#64748B] flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Your data is encrypted and stored securely.
        </p>
        <Button size="lg" onClick={handleSave} loading={saving}>
          Save profile
        </Button>
      </div>
    </div>
  );
}
