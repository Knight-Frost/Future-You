'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { futureValueLumpSum, futureValueAnnuity } from '@/engine/calculator';
import { formatCurrency, formatPercent, formatMonths } from '@/lib/utils';
import { useSyncProfile } from '@/hooks/useSyncProfile';
import type { FinancialInputs, FinancialProjection } from '@/types';

// ─── Analytics API types ──────────────────────────────────────────────────────
interface CategorySummary {
  category: string;
  label: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  color: string;
  description: string;
}

interface AnalyticsData {
  categoryBreakdown: CategorySummary[];
  monthlyTrend: { month: string; totalExpenses: number }[];
  monthlyAverage: number;
  totalTransactions: number;
  lowConfidenceCount: number;
  monthsAnalyzed: number;
}

// ─── Chart palette ────────────────────────────────────────────────────────────
const GREEN  = '#16a34a';
const BLUE   = '#2563eb';
const RED    = '#ef4444';
const AMBER  = '#f59e0b';
const SLATE  = '#94a3b8';
const TEAL   = '#0d9488';

// ─── CSV generator ────────────────────────────────────────────────────────────
function generateSummaryCSV(
  inputs: FinancialInputs,
  projection: FinancialProjection,
  healthStatus: string,
): string {
  const rows = [
    ['FutureYou — Summary Report', '', ''],
    ['Generated', new Date().toLocaleDateString('en-US'), ''],
    ['', '', ''],
    ['FINANCIAL OVERVIEW', '', ''],
    ['Metric', 'Value', 'Status'],
    ['Monthly Income',    formatCurrency(inputs.monthlyIncome),    ''],
    ['Monthly Expenses',  formatCurrency(inputs.monthlyExpenses),  ''],
    ['Monthly Surplus',   formatCurrency(projection.netSurplus),   projection.netSurplus >= 0 ? 'Positive' : 'DEFICIT'],
    ['Savings Rate',      formatPercent(projection.savingsRate),   projection.savingsRate >= 0.15 ? 'On target' : 'Below 15% target'],
    ['', '', ''],
    ['DEBT', '', ''],
    ['Debt Balance',         formatCurrency(inputs.debtBalance), ''],
    ['Monthly Debt Payment', formatCurrency(inputs.debtMonthlyPayment), ''],
    ['Interest Rate (APR)',  formatPercent(inputs.debtAnnualRate), ''],
    ['Payoff Timeline',      isFinite(projection.debtPayoffMonths) ? formatMonths(projection.debtPayoffMonths) : 'Never (increase payment)', ''],
    ['Total Interest Cost',  isFinite(projection.totalInterest) ? formatCurrency(projection.totalInterest) : 'N/A', ''],
    ['Debt-to-Income Ratio', formatPercent(projection.debtToIncomeRatio), projection.debtToIncomeRatio < 0.15 ? 'Healthy' : 'Elevated'],
    ['', '', ''],
    ['SAVINGS', '', ''],
    ['Current Savings',   formatCurrency(inputs.currentSavings), ''],
    ['Emergency Fund',    `${projection.emergencyFundMonths.toFixed(1)} months`, projection.emergencyFundMonths >= 3 ? 'Adequate' : 'Build to 3 months'],
    ['Goal Amount',       formatCurrency(inputs.goalAmount), ''],
    ['Goal Timeline',     isFinite(projection.goalTimelineMonths) ? formatMonths(projection.goalTimelineMonths) : 'N/A', ''],
    ['', '', ''],
    ['INVESTMENTS', '', ''],
    ['Monthly Investment',  formatCurrency(inputs.monthlyInvestment), ''],
    ['Investment Balance',  formatCurrency(inputs.investmentBalance), ''],
    ['10-Year Value (5%)',  formatCurrency(projection.investments.tenYear.conservative),    'Conservative'],
    ['10-Year Value (7%)',  formatCurrency(projection.investments.tenYear.moderate),        'Moderate'],
    ['10-Year Value (9%)',  formatCurrency(projection.investments.tenYear.optimistic),      'Optimistic'],
    ['20-Year Value (7%)',  formatCurrency(projection.investments.twentyYear.moderate),     'Moderate'],
    ['30-Year Value (7%)',  formatCurrency(projection.investments.thirtyYear.moderate),     'Moderate'],
    ['', '', ''],
    ['HEALTH ASSESSMENT', '', ''],
    ['Overall Status', healthStatus.toUpperCase(), ''],
    ['Net Worth', formatCurrency(inputs.currentSavings + inputs.investmentBalance - inputs.debtBalance), ''],
  ];
  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Print report (hidden on screen, visible on print) ────────────────────────
function PrintReport({
  inputs,
  projection,
  healthStatus,
}: {
  inputs: FinancialInputs;
  projection: FinancialProjection;
  healthStatus: string;
}) {
  const netWorth = inputs.currentSavings + inputs.investmentBalance - inputs.debtBalance;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const healthColors: Record<string, string> = {
    strong: '#059669', healthy: '#2563EB', attention: '#D97706', critical: '#DC2626',
  };

  return (
    <div id="print-report" style={{ fontFamily: 'Georgia, serif', maxWidth: 700, margin: '0 auto', padding: 40 }}>
      <div style={{ borderBottom: '2px solid #15803d', paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#15803d', margin: 0 }}>FutureYou — Financial Summary</h1>
        <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Generated {today}</p>
      </div>

      <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: (healthColors[healthStatus] ?? '#6b7280') + '15', color: healthColors[healthStatus] ?? '#6b7280', border: `1px solid ${(healthColors[healthStatus] ?? '#6b7280')}30`, marginBottom: 24 }}>
        Financial Health: {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Monthly Surplus',  value: formatCurrency(projection.netSurplus),                   color: projection.netSurplus >= 0 ? '#059669' : '#DC2626' },
          { label: 'Net Worth',        value: formatCurrency(netWorth),                                 color: netWorth >= 0 ? '#0F172A' : '#DC2626' },
          { label: 'Emergency Fund',   value: `${projection.emergencyFundMonths.toFixed(1)} mo`,        color: projection.emergencyFundMonths >= 3 ? '#059669' : '#D97706' },
          { label: 'Savings Rate',     value: formatPercent(projection.savingsRate),                    color: projection.savingsRate >= 0.15 ? '#059669' : '#D97706' },
        ].map((m) => (
          <div key={m.label} style={{ padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', margin: '0 0 4px' }}>{m.label}</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: m.color, margin: 0 }}>{m.value}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', paddingBottom: 8, marginBottom: 12 }}>Monthly Cashflow</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, fontSize: 13 }}>
        <tbody>
          {[
            { label: 'Income',      value: formatCurrency(inputs.monthlyIncome) },
            { label: 'Expenses',    value: formatCurrency(inputs.monthlyExpenses) },
            { label: 'Debt Payments', value: formatCurrency(inputs.debtMonthlyPayment) },
            { label: 'Investments', value: formatCurrency(inputs.monthlyInvestment) },
            { label: 'Net Surplus', value: formatCurrency(projection.netSurplus), bold: true },
          ].map((row) => (
            <tr key={row.label} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '7px 0', color: '#334155', fontWeight: row.bold ? 700 : 400 }}>{row.label}</td>
              <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: row.bold ? 800 : 600, color: row.bold ? (projection.netSurplus >= 0 ? '#059669' : '#DC2626') : '#0F172A' }}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {inputs.debtBalance > 0 && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', paddingBottom: 8, marginBottom: 12 }}>Debt Analysis</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, fontSize: 13 }}>
            <tbody>
              {[
                { label: 'Total Balance',        value: formatCurrency(inputs.debtBalance) },
                { label: 'Monthly Payment',      value: formatCurrency(inputs.debtMonthlyPayment) },
                { label: 'Interest Rate (APR)',  value: formatPercent(inputs.debtAnnualRate) },
                { label: 'Payoff Timeline',      value: isFinite(projection.debtPayoffMonths) ? formatMonths(projection.debtPayoffMonths) : 'Never — increase payment' },
                { label: 'Total Interest Cost',  value: isFinite(projection.totalInterest) ? formatCurrency(projection.totalInterest) : 'N/A' },
                { label: 'Debt-to-Income Ratio', value: formatPercent(projection.debtToIncomeRatio) },
              ].map((row) => (
                <tr key={row.label} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '7px 0', color: '#334155' }}>{row.label}</td>
                  <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', paddingBottom: 8, marginBottom: 12 }}>Investment Projections</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f0fdf4' }}>
            <th style={{ padding: '7px 0', textAlign: 'left',  color: '#64748B', fontWeight: 700, fontSize: 11 }}>Scenario</th>
            <th style={{ padding: '7px 0', textAlign: 'right', color: '#64748B', fontWeight: 700, fontSize: 11 }}>10 Years</th>
            <th style={{ padding: '7px 0', textAlign: 'right', color: '#64748B', fontWeight: 700, fontSize: 11 }}>20 Years</th>
            <th style={{ padding: '7px 0', textAlign: 'right', color: '#64748B', fontWeight: 700, fontSize: 11 }}>30 Years</th>
          </tr>
        </thead>
        <tbody>
          {(['conservative', 'moderate', 'optimistic'] as const).map((key, i) => (
            <tr key={key} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '7px 0', color: '#334155' }}>{['Conservative (5%)', 'Moderate (7%)', 'Optimistic (9%)'][i]}</td>
              <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>{formatCurrency(projection.investments.tenYear[key])}</td>
              <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>{formatCurrency(projection.investments.twentyYear[key])}</td>
              <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>{formatCurrency(projection.investments.thirtyYear[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, marginTop: 16 }}>
        <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>
          Generated by FutureYou on {today}. Projections are estimates based on current inputs and do not account for inflation, taxes, or market volatility. Not financial advice.
        </p>
      </div>
    </div>
  );
}

// ─── Chart section wrapper ────────────────────────────────────────────────────
function ChartCard({
  question,
  insight,
  children,
}: {
  question: string;
  insight: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-primary rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="heading-section" style={{ fontFamily: 'var(--font-headline)' }}>{question}</h3>
      </div>
      <div className="px-6 pt-5 pb-4">{children}</div>
      <div className="px-6 pb-5">
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2"
          style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.18)' }}
        >
          <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: '#15803d' }}>{insight}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card with whole-card hover tooltip ──────────────────────────────────

interface TooltipLine { op?: string; label: string; value: string; result?: boolean }

function StatCard({
  label, value, color, icon, tooltipLines, tooltipNote,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
  tooltipLines: TooltipLine[];
  tooltipNote?: string;
}) {
  return (
    <div
      className="group/stat surface-glass rounded-2xl p-5 flex flex-col gap-2"
      style={{ position: 'relative', cursor: 'default' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>
        <p className="label-caps">{label}</p>
      </div>
      <p className="metric-value-sm tabular-nums" style={{ color }}>{value}</p>

      {/* Whole-card hover tooltip */}
      <div
        className="invisible opacity-0 group-hover/stat:visible group-hover/stat:opacity-100 transition-all duration-150"
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 230,
          background: '#f0fdf4',
          border: '1px solid rgba(22,163,74,0.2)',
          borderRadius: 10,
          padding: '10px 14px',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 8px 28px rgba(22,163,74,0.15), 0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* Arrow pointing up */}
        <div style={{
          position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
          width: 10, height: 10, background: '#f0fdf4', rotate: '45deg', borderRadius: 2,
          borderLeft: '1px solid rgba(22,163,74,0.2)', borderTop: '1px solid rgba(22,163,74,0.2)',
        }} />

        <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', color: 'rgba(21,128,61,0.5)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
          How it&apos;s calculated
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {tooltipLines.map((row, i) => (
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

        {tooltipNote && (
          <p style={{ fontSize: '0.66rem', color: 'rgba(21,128,61,0.5)', marginTop: 8, borderTop: '1px solid rgba(22,163,74,0.15)', paddingTop: 6, lineHeight: 1.4 }}>
            {tooltipNote}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Custom Recharts tooltip ──────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = formatter ?? formatCurrency;
  return (
    <div className="rounded-xl shadow-xl p-3 text-xs" style={{ background: '#111827', border: '1px solid #1f2937' }}>
      {label && <p className="mb-2 font-medium" style={{ color: '#94a3b8' }}>{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: p.color }} />
          <span style={{ color: '#cbd5e1' }}>{p.name}:</span>
          <span className="font-bold text-white">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsReportsPage() {
  useSyncProfile();
  const { inputs, projection, healthStatus } = useFinancialStore();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchAnalytics = useCallback(() => {
    fetch('/api/transactions/analytics?months=3')
      .then((r) => r.json())
      .then((json) => { if (json.hasData) setAnalyticsData(json.data); })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, []);

  useEffect(() => {
    fetchAnalytics();
    // Re-fetch when the user returns to this tab (e.g. after importing transactions)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAnalytics(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchAnalytics]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const netWorth    = inputs.currentSavings + inputs.investmentBalance - inputs.debtBalance;
  const healthColors: Record<string, string> = {
    strong: GREEN, healthy: BLUE, attention: '#d97706', critical: '#dc2626',
  };
  const healthLabels: Record<string, string> = {
    strong: 'Strong', healthy: 'Healthy', attention: 'Needs Attention', critical: 'Critical',
  };

  // ── 1. Cash Flow ───────────────────────────────────────────────────────────
  // Preference: real transaction data for historical months, projected forward.
  // Surplus = true net surplus (income − expenses − debt − investment).
  const cashFlowData = useMemo(() => {
    const netSurplus = inputs.monthlyIncome - inputs.monthlyExpenses - inputs.debtMonthlyPayment - inputs.monthlyInvestment;

    if (analyticsData?.monthlyTrend?.length) {
      // Historical months from real transactions
      const historical = analyticsData.monthlyTrend.map((m) => ({
        month: m.month,
        Income:   inputs.monthlyIncome,
        Expenses: m.totalExpenses,
        Surplus:  Math.max(0, inputs.monthlyIncome - m.totalExpenses - inputs.debtMonthlyPayment - inputs.monthlyInvestment),
        projected: false,
      }));

      // Append up to 3 projected future months so the chart has a forward view
      const lastDate = new Date();
      const projected = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(lastDate);
        d.setMonth(d.getMonth() + i + 1);
        return {
          month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          Income:   inputs.monthlyIncome,
          Expenses: inputs.monthlyExpenses,
          Surplus:  Math.max(0, netSurplus),
          projected: true,
        };
      });

      return [...historical, ...projected];
    }

    // No transaction data — show 12-month projection from store values
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    return months.map((_, i) => {
      const idx = (now.getMonth() + i) % 12;
      return {
        month: months[idx],
        Income:   inputs.monthlyIncome,
        Expenses: inputs.monthlyExpenses,
        Surplus:  Math.max(0, netSurplus),
        projected: true,
      };
    });
  }, [analyticsData, inputs.monthlyIncome, inputs.monthlyExpenses, inputs.debtMonthlyPayment, inputs.monthlyInvestment]);

  const surplusInsight = (() => {
    if (inputs.monthlyExpenses === 0) return 'Your expenses appear to be $0. Complete Step 2 of your Plan to get an accurate savings rate.';
    const rate = projection.savingsRate;
    if (rate < 0)    return 'Your expenses exceed your income. Every month you delay costs you more — cut expenses or increase income now.';
    if (rate < 0.05) return `You keep only ${formatPercent(rate)} of your income. The recommended minimum is 15%. Small cuts compound into large freedom.`;
    if (rate < 0.15) return `Your savings rate of ${formatPercent(rate)} is below the 15% target. Closing that gap by ${formatPercent(0.15 - rate)} per month reshapes your trajectory.`;
    return `Your ${formatPercent(rate)} savings rate exceeds the 15% benchmark. Channel surplus into investments to compound wealth faster each year.`;
  })();

  // ── 2. Spending Breakdown — real transaction data only, no estimates ─────────
  const spendingData = useMemo(() => {
    if (!analyticsData?.categoryBreakdown?.length) return [];
    return analyticsData.categoryBreakdown
      .map((c) => ({ name: c.label, value: Math.round(c.totalAmount / (analyticsData.monthsAnalyzed || 1)), color: c.color }))
      .filter((d) => d.value > 0);
  }, [analyticsData]);

  const isRealSpendingData  = !!analyticsData?.categoryBreakdown?.length;
  const spendingTotal       = spendingData.reduce((s, d) => s + d.value, 0);
  const largestCategory     = spendingData.length > 0 ? [...spendingData].sort((a, b) => b.value - a.value)[0] : null;
  const spendingInsight     = largestCategory
    ? `Based on your actual transactions, your biggest category is ${largestCategory.name} at ${formatCurrency(largestCategory.value)}/mo (${formatPercent(spendingTotal > 0 ? largestCategory.value / spendingTotal : 0)}). A 10% reduction frees ${formatCurrency(largestCategory.value * 0.1)}/mo for debt or savings.`
    : 'Import transactions to see where your money is actually going.';

  // ── 3. Debt Paydown ────────────────────────────────────────────────────────
  const debtData = useMemo(() => {
    if (inputs.debtBalance <= 0) return [];
    const data: { month: string; Balance: number }[] = [];
    let balance = inputs.debtBalance;
    const monthlyRate = inputs.debtAnnualRate / 12;
    const payment     = inputs.debtMonthlyPayment;
    for (let i = 0; i <= 60; i++) {
      if (balance <= 0) { data.push({ month: `M${i}`, Balance: 0 }); break; }
      const label = i === 0 ? 'Now' : i % 12 === 0 ? `Yr ${i/12}` : `M${i}`;
      data.push({ month: label, Balance: Math.round(balance) });
      const interest = balance * monthlyRate;
      balance = Math.max(0, balance - (payment - interest));
    }
    return data;
  }, [inputs.debtBalance, inputs.debtAnnualRate, inputs.debtMonthlyPayment]);

  const debtInsight = inputs.debtBalance <= 0
    ? 'No outstanding debt recorded. Use the Plan to record any debt obligations.'
    : !isFinite(projection.debtPayoffMonths)
    ? `At ${formatCurrency(inputs.debtMonthlyPayment)}/mo you are not covering the interest. Increase your payment to start reducing the balance.`
    : `At your current payment, debt-free in ~${Math.round(projection.debtPayoffMonths)} months with ${formatCurrency(projection.totalInterest)} total interest. An extra $50/mo saves significantly.`;

  // ── 4. Net Worth Growth ────────────────────────────────────────────────────
  // Each scenario compounds ALL wealth-building cash flows (investments +
  // savings balance + monthly surplus) at its own rate so the three lines
  // actually diverge. Using a flat linear savings term made all lines identical.
  const netWorthData = useMemo(() => {
    const data: { year: string; Conservative: number; Moderate: number; Optimistic: number }[] = [];
    const debtMonthlyRate = inputs.debtAnnualRate / 12;
    const payment         = inputs.debtMonthlyPayment;
    const monthlySurplus  = Math.max(0, projection.netSurplus);

    for (let yr = 0; yr <= 10; yr++) {
      // Investment portfolio: existing balance + ongoing contributions, compounded
      const investC = futureValueLumpSum(inputs.investmentBalance, 0.05, yr) + futureValueAnnuity(inputs.monthlyInvestment, 0.05, yr);
      const investM = futureValueLumpSum(inputs.investmentBalance, 0.07, yr) + futureValueAnnuity(inputs.monthlyInvestment, 0.07, yr);
      const investO = futureValueLumpSum(inputs.investmentBalance, 0.09, yr) + futureValueAnnuity(inputs.monthlyInvestment, 0.09, yr);

      // Savings: existing balance + surplus redirected into savings, compounded
      // This is what makes scenarios diverge — same surplus, different growth rate
      const savingsC = futureValueLumpSum(inputs.currentSavings, 0.05, yr) + futureValueAnnuity(monthlySurplus, 0.05, yr);
      const savingsM = futureValueLumpSum(inputs.currentSavings, 0.07, yr) + futureValueAnnuity(monthlySurplus, 0.07, yr);
      const savingsO = futureValueLumpSum(inputs.currentSavings, 0.09, yr) + futureValueAnnuity(monthlySurplus, 0.09, yr);

      // Remaining debt balance at this year
      let debtRemaining = inputs.debtBalance;
      for (let m = 0; m < yr * 12; m++) {
        if (debtRemaining <= 0) break;
        const interest = debtRemaining * debtMonthlyRate;
        debtRemaining  = Math.max(0, debtRemaining - (payment - interest));
      }

      data.push({
        year:         yr === 0 ? 'Now' : `Yr ${yr}`,
        Conservative: Math.round(savingsC + investC - debtRemaining),
        Moderate:     Math.round(savingsM + investM - debtRemaining),
        Optimistic:   Math.round(savingsO + investO - debtRemaining),
      });
    }
    return data;
  }, [inputs, projection.netSurplus]);

  const nwAt10          = netWorthData[10];
  const netWorthInsight = nwAt10
    ? `At a moderate 7% return, your net worth is projected to reach ${formatCurrency(nwAt10.Moderate)} in 10 years. Investing $200/mo more today significantly improves this trajectory.`
    : 'Add investment details in your Plan to see your net worth growth projection.';

  // ── Export handlers ────────────────────────────────────────────────────────
  const handlePrint = () => {
    setPdfLoading(true);
    setTimeout(() => { window.print(); setPdfLoading(false); }, 100);
  };

  const handleCSV = () => {
    const csv  = generateSummaryCSV(inputs, projection, healthStatus);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `futureyou-report-${date}.csv`);
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-report-wrapper { display: block !important; }
          .no-print { display: none !important; }
        }
        @media screen {
          #print-report-wrapper { display: none; }
        }
      `}</style>

      {/* ── Screen UI ─────────────────────────────────────────────────────── */}
      <div className="space-y-8 animate-fade-in no-print">

        {/* ── Header — CBG pattern ────────────────────────────────────────── */}
        <div>
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-1"
            style={{ color: 'var(--ember-orange)' }}
          >
            Analytics
          </p>
          <h1 className="heading-page mb-1" style={{ fontFamily: 'var(--font-headline)' }}>
            Analytics &amp; Reports
          </h1>
          <p className="body-sm">
            Visual projections, spending analysis, and downloadable reports — all in one place.
          </p>
        </div>

        {/* ── Summary stat cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ position: 'relative', zIndex: 10 }}>
          <StatCard
            label="Monthly Surplus"
            value={formatCurrency(projection.netSurplus)}
            color={projection.netSurplus >= 0 ? GREEN : '#dc2626'}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>}
            tooltipLines={[
              { label: 'Income',        value: formatCurrency(inputs.monthlyIncome) },
              { op: '−', label: 'Expenses',      value: formatCurrency(inputs.monthlyExpenses) },
              { op: '−', label: 'Debt payment',  value: formatCurrency(inputs.debtMonthlyPayment) },
              { op: '−', label: 'Investment',    value: formatCurrency(inputs.monthlyInvestment) },
              { op: '=', label: 'Net surplus',   value: formatCurrency(projection.netSurplus), result: true },
            ]}
            tooltipNote="Take-home after all committed monthly outflows."
          />

          <StatCard
            label="Net Worth"
            value={formatCurrency(netWorth)}
            color={netWorth >= 0 ? 'var(--foreground)' : '#dc2626'}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>}
            tooltipLines={[
              { label: 'Savings',      value: formatCurrency(inputs.currentSavings) },
              { op: '+', label: 'Investments', value: formatCurrency(inputs.investmentBalance) },
              { op: '−', label: 'Total debt',  value: formatCurrency(inputs.debtBalance) },
              { op: '=', label: 'Net worth',   value: formatCurrency(netWorth), result: true },
            ]}
            tooltipNote="Assets you own minus all outstanding liabilities."
          />

          <StatCard
            label="Savings Rate"
            value={formatPercent(projection.savingsRate)}
            color={projection.savingsRate >= 0.15 ? GREEN : '#d97706'}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
            tooltipLines={[
              { label: 'Income',         value: formatCurrency(inputs.monthlyIncome) },
              { op: '−', label: 'Expenses',        value: formatCurrency(inputs.monthlyExpenses) },
              { op: '−', label: 'Debt payment',    value: formatCurrency(inputs.debtMonthlyPayment) },
              { op: '−', label: 'Investment',      value: formatCurrency(inputs.monthlyInvestment) },
              { op: '÷', label: 'Income again',    value: formatCurrency(inputs.monthlyIncome) },
              { op: '=', label: 'Savings rate',    value: formatPercent(projection.savingsRate), result: true },
            ]}
            tooltipNote="Net surplus ÷ income. Target: 15% minimum. 20%+ = strong path."
          />

          <StatCard
            label="Financial Health"
            value={healthLabels[healthStatus] ?? healthStatus}
            color={healthColors[healthStatus] ?? SLATE}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>}
            tooltipLines={[
              { label: 'Savings rate',    value: formatPercent(projection.savingsRate) },
              { label: 'Emergency fund',  value: `${projection.emergencyFundMonths.toFixed(1)} mo` },
              { label: 'Debt-to-income',  value: formatPercent(projection.debtToIncomeRatio) },
              { op: '→', label: 'Status', value: healthLabels[healthStatus] ?? healthStatus, result: true },
            ]}
            tooltipNote="Strong = savings ≥15%, EF ≥3 mo, no high-interest debt."
          />
        </div>

        {/* ── Charts — 2-column grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Chart 1: Cash Flow */}
          <ChartCard
            question="Where does your money go each month?"
            insight={surplusInsight}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: analyticsData?.monthlyTrend?.length ? GREEN : AMBER }} />
              <span className="text-xs font-medium" style={{ color: analyticsData?.monthlyTrend?.length ? '#15803d' : '#92400e' }}>
                {analyticsData?.monthlyTrend?.length
                  ? `Real expenses from transactions + 3-month projection — income from Plan`
                  : 'Projected from Plan inputs — import transactions for real data'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cashFlowData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Income"   stroke={BLUE}  fill="rgba(37,99,235,0.12)"  strokeWidth={2} name="Income"   />
                <Area type="monotone" dataKey="Expenses" stroke={RED}   fill="rgba(239,68,68,0.10)"  strokeWidth={2} name="Expenses" />
                <Area type="monotone" dataKey="Surplus"  stroke={GREEN} fill="rgba(22,163,74,0.12)"  strokeWidth={2} name="Net Surplus" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3 justify-center flex-wrap">
              {[{ color: BLUE, label: 'Income' }, { color: RED, label: 'Expenses' }, { color: GREEN, label: 'Net Surplus' }].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: item.color }} />
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>— — Projected</span>
              </div>
            </div>
          </ChartCard>

          {/* Chart 2: Spending Breakdown — real data only */}
          <ChartCard
            question="What are your biggest expense categories?"
            insight={spendingInsight}
          >
            {analyticsLoading ? (
              <div className="py-10 flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GREEN, borderTopColor: 'transparent' }} />
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Loading transaction data…</span>
              </div>
            ) : isRealSpendingData && spendingData.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
                  <span className="text-xs font-medium" style={{ color: '#15803d' }}>
                    Real data — {analyticsData!.totalTransactions} transactions, {analyticsData!.monthsAnalyzed}-month avg
                  </span>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={spendingData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                        {spendingData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 min-w-[160px]">
                    {spendingData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                          <span style={{ color: 'var(--foreground)' }}>{item.name}</span>
                        </div>
                        <span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#F1F5F9' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#334155' }}>No transaction data yet</p>
                  <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                    Import a bank CSV or Excel file to see exactly where your money goes.
                  </p>
                </div>
                <a
                  href="/transactions"
                  className="btn btn-primary btn-sm"
                >
                  Import transactions
                </a>
              </div>
            )}
          </ChartCard>

          {/* Chart 3: Debt Paydown */}
          <ChartCard
            question="When will you be debt-free?"
            insight={debtInsight}
          >
            {inputs.debtBalance > 0 && debtData.length > 0 ? (
              <>
              <div className="mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: AMBER }} />
                <span className="text-xs font-medium" style={{ color: '#92400e' }}>
                  Projected from Plan — {formatCurrency(inputs.debtBalance)} balance at {(inputs.debtAnnualRate * 100).toFixed(0)}% APR, {formatCurrency(inputs.debtMonthlyPayment)}/mo payment
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={debtData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} interval={Math.floor(debtData.length / 6)} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Balance" stroke={AMBER} fill="rgba(245,158,11,0.12)" strokeWidth={2} name="Debt Balance" />
                </AreaChart>
              </ResponsiveContainer>
              </>
            ) : (
              <div className="py-10 text-center">
                <div className="icon-box icon-box-lg icon-box-green mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="font-semibold text-sm" style={{ color: GREEN }}>No debt recorded</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Add debt details in your Plan to see paydown projections.</p>
              </div>
            )}
          </ChartCard>

          {/* Chart 4: Net Worth Growth */}
          <ChartCard
            question="How fast is your wealth growing?"
            insight={netWorthInsight}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL }} />
              <span className="text-xs font-medium" style={{ color: '#0f766e' }}>
                Projected from Plan — {formatCurrency(inputs.currentSavings)} savings, {formatCurrency(inputs.investmentBalance)} invested, {formatCurrency(inputs.monthlyInvestment)}/mo contributions, {formatCurrency(Math.max(0, projection.netSurplus))}/mo net surplus
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={netWorthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Conservative" stroke={BLUE}  strokeWidth={2}   strokeDasharray="5 3" dot={false} name="Conservative (5%)" />
                <Line type="monotone" dataKey="Moderate"     stroke={AMBER}  strokeWidth={2.5} dot={false} name="Moderate (7%)"     />
                <Line type="monotone" dataKey="Optimistic"   stroke={GREEN}  strokeWidth={2}   dot={false} name="Optimistic (9%)"   />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3 justify-center">
              {[{ color: BLUE, label: 'Conservative (5%)', dashed: true }, { color: AMBER, label: 'Moderate (7%)' }, { color: GREEN, label: 'Optimistic (9%)' }].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  {item.dashed
                    ? <svg width="16" height="10" viewBox="0 0 16 10"><line x1="0" y1="5" x2="16" y2="5" stroke={item.color} strokeWidth="2" strokeDasharray="4 2" /></svg>
                    : <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: item.color }} />}
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* ── Export Reports — CBG-style section ──────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
            </svg>
            <h2
              className="font-semibold text-base"
              style={{ fontFamily: 'var(--font-headline)', color: 'var(--foreground)' }}
            >
              Export Reports
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PDF / Print card */}
            <button
              onClick={handlePrint}
              disabled={pdfLoading}
              className="surface-primary rounded-2xl p-5 flex items-center gap-4 text-left transition-all hover:shadow-card-prominent"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(22,163,74,0.10)', color: GREEN }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Full Summary Report</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Print or save as PDF — income, debt, savings, projections</p>
              </div>
              {pdfLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: GREEN, borderTopColor: 'transparent' }} />
              ) : (
                <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted-foreground)' }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </button>

            {/* CSV card */}
            <button
              onClick={handleCSV}
              className="surface-primary rounded-2xl p-5 flex items-center gap-4 text-left transition-all hover:shadow-card-prominent"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(37,99,235,0.10)', color: BLUE }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Spreadsheet Export</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Download CSV — open in Excel, Sheets, or share with your accountant</p>
              </div>
              <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted-foreground)' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>

          {/* Data quality notice */}
          <div
            className="mt-4 rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.20)' }}
          >
            <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
              Report accuracy depends on your data. Keep your income, expenses, debt, and investments up to date in your{' '}
              <a href="/plan" style={{ color: '#d97706', fontWeight: 600, textDecoration: 'underline' }}>Financial Plan</a>.
              Projections do not account for inflation, taxes, or market volatility. Not financial advice.
            </p>
          </div>
        </div>

      </div>

      {/* ── Print-only report ──────────────────────────────────────────────── */}
      <div id="print-report-wrapper">
        <PrintReport inputs={inputs} projection={projection} healthStatus={healthStatus} />
      </div>
    </>
  );
}
