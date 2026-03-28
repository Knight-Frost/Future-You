'use client';

import { useState, useEffect, useCallback } from 'react';
import { CATEGORY_META, type ExpenseCategory } from '@/engine/expense/classification';
import { formatCurrency, cn } from '@/lib/utils';
import { useFinancialStore } from '@/stores/useFinancialStore';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  date: string;
  rawDescription: string;
  normalizedName: string;
  amount: number;
  category: ExpenseCategory;
  userCategory: ExpenseCategory | null;
  confidence: number;
  explanation: string;
  classifiedBy: string;
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ confidence, classifiedBy }: { confidence: number; classifiedBy: string }) {
  const color =
    classifiedBy === 'USER_RULE' ? '#6366F1' :
    confidence >= 85 ? '#10B981' :
    confidence >= 60 ? '#F59E0B' :
    '#EF4444';

  const label =
    classifiedBy === 'USER_RULE' ? 'Your rule' :
    confidence >= 85 ? 'High confidence' :
    confidence >= 60 ? 'Medium confidence' :
    'Needs review';

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full" style={{ background: '#EEF2FF' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${confidence}%`, background: color }}
        />
      </div>
      <span className="text-[10px] tabular-nums" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: ExpenseCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}30` }}
    >
      {meta.label}
    </span>
  );
}

// ─── Explanation popover ──────────────────────────────────────────────────────

function WhyPopover({ explanation, category }: { explanation: string; category: ExpenseCategory }) {
  return (
    <div className="group relative inline-flex">
      <button
        className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
        style={{ background: '#EEF2FF', color: '#6366F1' }}
        aria-label="Why this category"
      >
        ?
      </button>
      <div
        className="absolute left-5 top-0 z-50 w-64 rounded-xl p-3.5 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
        style={{ background: '#1E293B', color: '#F1F5F9', minWidth: 240 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: CATEGORY_META[category].color + '25', color: CATEGORY_META[category].color }}
          >
            {CATEGORY_META[category].label}
          </span>
          <span className="text-[10px] text-[#94A3B8]">includes:</span>
        </div>
        <p className="text-xs text-[#94A3B8] mb-2 leading-relaxed">{CATEGORY_META[category].description}</p>
        <div className="border-t border-[#334155] pt-2 mt-2">
          <p className="text-[10px] text-[#64748B] mb-1 uppercase tracking-wide font-bold">Why this transaction:</p>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">{explanation}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Inline category correction ───────────────────────────────────────────────

function CategoryCorrector({
  txId,
  currentCategory,
  onCorrected,
}: {
  txId: string;
  currentCategory: ExpenseCategory;
  onCorrected: (newCategory: ExpenseCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ruleCreated, setRuleCreated] = useState(false);

  const CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];

  const handleSelect = async (cat: ExpenseCategory) => {
    if (cat === currentCategory) { setOpen(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCategory: cat, createRule: true }),
      });
      if (res.ok) {
        onCorrected(cat);
        setRuleCreated(true);
        setTimeout(() => setRuleCreated(false), 3000);
      }
    } catch {
      // Silently fail — correction UI closes; user can retry
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  if (ruleCreated) {
    return (
      <span className="text-xs text-[#059669] font-medium flex items-center gap-1">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Rule created
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-[#64748B] hover:text-[#2563EB] transition-colors flex items-center gap-1"
        disabled={saving}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Correct
      </button>

      {open && (
        <div
          className="absolute right-0 top-6 z-50 w-52 rounded-xl overflow-hidden shadow-xl"
          style={{ background: '#1E293B', border: '1px solid #334155' }}
        >
          <div className="px-3 py-2" style={{ borderBottom: '1px solid #334155' }}>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-bold">Change category</p>
            <p className="text-[10px] text-[#475569] mt-0.5">A rule will be created automatically.</p>
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleSelect(cat)}
              className={cn(
                'w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors',
                cat === currentCategory ? 'opacity-50 cursor-default' : 'hover:bg-[#273349]'
              )}
              style={{ color: CATEGORY_META[cat].color }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_META[cat].color }} />
              {CATEGORY_META[cat].label}
              {cat === currentCategory && (
                <span className="ml-auto text-[9px] text-[#475569]">current</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    color: '#6366F1',
    bg: '#EEF2FF',
    title: 'Normalize',
    desc: '"AMZN Mktp US*1234X" → "Amazon"',
  },
  {
    color: '#0284C7',
    bg: '#F0F9FF',
    title: 'Classify',
    desc: 'Matched to one of 9 categories with an explanation',
  },
  {
    color: '#059669',
    bg: '#F0FDF4',
    title: 'Deduplicate',
    desc: 'SHA-256 hash prevents re-importing the same row twice',
  },
];

const BANK_STEPS = [
  { bank: 'Chase', path: 'Account → Statements → Download → CSV' },
  { bank: 'Bank of America', path: 'Account Activity → Download → CSV' },
  { bank: 'Capital One', path: 'Transactions → Download → CSV' },
  { bank: 'Wells Fargo', path: 'Transactions → Export → CSV' },
  { bank: 'Any other bank', path: 'Look for "Export", "Download", or "Statement"' },
];

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Left — CTA + pipeline */}
      <div className="card p-8 flex flex-col">
        {/* Hero */}
        <div className="mb-6">
          <div className="icon-box icon-box-lg icon-box-blue mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h3 className="heading-card mb-2">Connect your spending</h3>
          <p className="body-sm">
            Import a bank or credit card CSV and every transaction is automatically named, categorized, and explained — in seconds.
          </p>
        </div>

        {/* Pipeline steps */}
        <div className="space-y-3 mb-8">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                style={{ background: step.bg, color: step.color }}
              >
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{step.title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: '9 categories', color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Auto-explained', color: '#0284C7', bg: '#F0F9FF' },
            { label: 'Confidence scored', color: '#D97706', bg: '#FFFBEB' },
            { label: 'Learns corrections', color: '#059669', bg: '#F0FDF4' },
          ].map((badge) => (
            <span
              key={badge.label}
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <button
            onClick={onImport}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
          <p className="text-center text-xs mt-2" style={{ color: '#94A3B8' }}>
            Supports .csv and .xlsx files from any bank
          </p>
        </div>
      </div>

      {/* Right — bank export guide + sample */}
      <div className="flex flex-col gap-5">
        {/* Bank export guide */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#F0F9FF' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h4 className="text-sm font-bold" style={{ color: '#0F172A' }}>How to export from your bank</h4>
          </div>
          <div className="space-y-3">
            {BANK_STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5"
                  style={{ background: '#F1F5F9', color: '#475569' }}
                >
                  {s.bank}
                </span>
                <p className="text-xs" style={{ color: '#64748B' }}>{s.path}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What you'll see */}
        <div className="card p-6 flex-1 flex flex-col">
          <h4 className="text-sm font-bold mb-4" style={{ color: '#0F172A' }}>What each row shows after import</h4>
          <div className="space-y-3 flex-1">
            {[
              { icon: '🏷️', label: 'Merchant name', desc: 'Cleaned and normalised from raw bank text' },
              { icon: '💰', label: 'Amount', desc: 'Exact amount from your statement' },
              { icon: '🗂️', label: 'Category', desc: 'Auto-classified into one of 9 spending categories' },
              { icon: '✅', label: 'Confidence score', desc: 'How certain the classifier is — correct any mismatches' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="text-base leading-none mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{item.label}</p>
                  <p className="text-[11px] leading-snug" style={{ color: '#64748B' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-center mt-4 pt-3" style={{ color: '#94A3B8', borderTop: '1px solid #F1F5F9' }}>
            Your real data will appear here after import
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Import history panel ─────────────────────────────────────────────────────

interface ImportBatch {
  batchId: string;
  importedAt: string;
  transactionCount: number;
  totalSpend: number;
  earliestDate: string;
  latestDate: string;
  importSource: string;
}

function ImportHistory({
  batches,
  activeBatch,
  onSelectBatch,
  onDeleteBatch,
  deletingBatch,
}: {
  batches: ImportBatch[];
  activeBatch: string | null;
  onSelectBatch: (batchId: string | null) => void;
  onDeleteBatch: (batchId: string) => void;
  deletingBatch: string | null;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (batches.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ background: '#F8FAFF', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#334155' }}>
            Import History — {batches.length} {batches.length === 1 ? 'import' : 'imports'}
          </span>
        </div>
        {activeBatch && (
          <button
            onClick={() => onSelectBatch(null)}
            className="text-xs font-semibold"
            style={{ color: '#6366F1' }}
          >
            Show all transactions
          </button>
        )}
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {batches.map((batch) => {
          const isActive = activeBatch === batch.batchId;
          const isDeleting = deletingBatch === batch.batchId;
          const isConfirming = confirmId === batch.batchId;

          const importedAt = new Date(batch.importedAt);
          const earliest = new Date(batch.earliestDate);
          const latest = new Date(batch.latestDate);
          const dateRange = earliest.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
            (earliest.toDateString() !== latest.toDateString()
              ? ' – ' + latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : ', ' + earliest.getFullYear());

          return (
            <div
              key={batch.batchId}
              className={cn(
                'flex items-center gap-4 px-5 py-3 transition-colors',
                isActive ? 'bg-[#EEF2FF]' : 'hover:bg-[#F8FAFF]',
              )}
            >
              {/* Select batch filter */}
              <button
                onClick={() => onSelectBatch(isActive ? null : batch.batchId)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: isActive ? '#6366F1' : '#EEF2FF' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#fff' : '#6366F1'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: isActive ? '#4338CA' : '#0F172A' }}>
                      {batch.transactionCount} transactions
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: '#64748B' }}>
                      {dateRange}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-bold" style={{ color: isActive ? '#4338CA' : '#334155' }}>
                      ${batch.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                      Imported {importedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {importedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </button>

              {/* Delete controls */}
              <div className="shrink-0 flex items-center gap-2">
                {isConfirming ? (
                  <>
                    <span className="text-xs text-[#EF4444] font-semibold">Delete this import?</span>
                    <button
                      onClick={() => { onDeleteBatch(batch.batchId); setConfirmId(null); }}
                      disabled={isDeleting}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-opacity"
                      style={{ background: '#EF4444', opacity: isDeleting ? 0.6 : 1 }}
                    >
                      {isDeleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: '#F1F5F9', color: '#64748B' }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmId(batch.batchId)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[#FEF2F2] group"
                    style={{ background: 'transparent' }}
                    title="Delete this import"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#EF4444] transition-colors">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { syncFromProfile } = useFinancialStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState<ExpenseCategory | 'ALL' | 'LOW_CONFIDENCE'>('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; lowConfidence: number; duplicates: number } | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);

  const LIMIT = 50;

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions/batches');
      if (res.ok) {
        const data = await res.json();
        setBatches(data.data ?? []);
      }
    } catch { /* non-critical */ }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(filter !== 'ALL' && filter !== 'LOW_CONFIDENCE' ? { category: filter } : {}),
        ...(filter === 'LOW_CONFIDENCE' ? { lowConfidence: 'true' } : {}),
        ...(activeBatch ? { batchId: activeBatch } : {}),
      });
      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) { setTransactions([]); setTotal(0); return; }
      const data = await res.json();
      setTransactions(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
    } catch {
      setTransactions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filter, activeBatch]);

  useEffect(() => { fetchTransactions(); fetchBatches(); }, [fetchTransactions, fetchBatches]);

  const handleCSVImport = async (csvText: string) => {
    try {
      const res = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      setImportResult({ imported: data.imported ?? 0, lowConfidence: data.lowConfidence ?? 0, duplicates: data.duplicates ?? 0 });
      setShowImport(false);
      fetchTransactions();
      fetchBatches();

      // Sync updated expense totals into the Zustand store so Dashboard,
      // Simulator, Goals, and Debt pages reflect the real imported data immediately.
      try {
        const profileRes = await fetch('/api/profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const p = profileData.data;
          if (p) {
            syncFromProfile({
              monthlyIncome:      p.monthlyIncome,
              monthlyExpenses:    p.monthlyExpenses,
              currentSavings:     p.currentSavings,
              debtBalance:        p.debtBalance,
              debtMonthlyPayment: p.debtMonthlyPayment,
              debtAnnualRate:     p.debtAnnualRate,
              monthlyInvestment:  p.monthlyInvestment,
              investmentBalance:  p.investmentBalance,
            });
          }
        }
      } catch {
        // Non-critical — projections will sync on next Dashboard visit
      }
    } catch {
      // Error shown in CSVImport modal
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    setDeletingBatch(batchId);
    try {
      await fetch(`/api/transactions/batches/${batchId}`, { method: 'DELETE' });
      // If we were viewing this batch, clear the filter
      if (activeBatch === batchId) setActiveBatch(null);
      // Refresh everything
      await Promise.all([fetchBatches(), fetchTransactions()]);
      // Re-sync the store so projections reflect the deletion
      const profileRes = await fetch('/api/profile');
      if (profileRes.ok) {
        const { data: p } = await profileRes.json();
        if (p) syncFromProfile({
          monthlyIncome:      p.monthlyIncome,
          monthlyExpenses:    p.monthlyExpenses,
          currentSavings:     p.currentSavings,
          debtBalance:        p.debtBalance,
          debtMonthlyPayment: p.debtMonthlyPayment,
          debtAnnualRate:     p.debtAnnualRate,
          monthlyInvestment:  p.monthlyInvestment,
          investmentBalance:  p.investmentBalance,
        });
      }
    } catch { /* silently ignore */ } finally {
      setDeletingBatch(null);
    }
  };

  const handleCategoryCorrection = (txId: string, newCategory: ExpenseCategory) => {
    setTransactions((prev) =>
      prev.map((tx) => tx.id === txId ? { ...tx, userCategory: newCategory } : tx)
    );
  };

  const lowConfidenceCount = transactions.filter((tx) => tx.confidence < 60 && !tx.userCategory).length;

  const CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="heading-page mb-2">Transactions</h1>
          <p className="body-sm">Every transaction is automatically categorized and explained. Correct any errors — the system learns.</p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="btn btn-primary btn-sm shrink-0 flex items-center gap-2"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import
        </button>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-4 animate-fade-in"
          style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
        >
          <div>
            <p className="text-sm font-semibold text-[#065F46]">
              Import complete — {importResult.imported} transactions added
            </p>
            <p className="text-xs text-[#059669] mt-0.5">
              {importResult.duplicates > 0 && `${importResult.duplicates} duplicates skipped. `}
              {importResult.lowConfidence > 0 && (
                <button onClick={() => setFilter('LOW_CONFIDENCE')} className="underline font-semibold">
                  {importResult.lowConfidence} need your review
                </button>
              )}
            </p>
          </div>
          <button onClick={() => setImportResult(null)} className="text-[#059669] text-xs">Dismiss</button>
        </div>
      )}

      {/* Low confidence alert */}
      {lowConfidenceCount > 0 && filter !== 'LOW_CONFIDENCE' && (
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-4"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="flex items-start gap-3">
            <svg className="text-[#D97706] shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#92400E]">
                {lowConfidenceCount} transaction{lowConfidenceCount !== 1 ? 's' : ''} need your review
              </p>
              <p className="text-xs text-[#D97706] mt-0.5">
                The system wasn't confident about these categories. Correcting them improves future classification.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilter('LOW_CONFIDENCE')}
            className="btn btn-sm shrink-0"
            style={{ background: '#D97706', color: 'white' }}
          >
            Review now
          </button>
        </div>
      )}

      {/* Import history */}
      {batches.length > 0 && (
        <ImportHistory
          batches={batches}
          activeBatch={activeBatch}
          onSelectBatch={(id) => { setActiveBatch(id); setPage(1); setFilter('ALL'); }}
          onDeleteBatch={handleDeleteBatch}
          deletingBatch={deletingBatch}
        />
      )}

      {/* Filter tabs */}
      {total > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {(['ALL', 'LOW_CONFIDENCE', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => { setFilter(cat as never); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filter === cat
                  ? 'text-white shadow-sm'
                  : 'text-[#64748B] hover:bg-[#F1F5F9]',
              )}
              style={filter === cat
                ? { background: cat === 'ALL' ? '#1E3A5F' : cat === 'LOW_CONFIDENCE' ? '#D97706' : CATEGORY_META[cat as ExpenseCategory].color }
                : { background: '#F8FAFF', border: '1px solid #EEF2FF' }
              }
            >
              {cat === 'ALL' ? `All (${total})` :
               cat === 'LOW_CONFIDENCE' ? `⚠ Needs review` :
               CATEGORY_META[cat as ExpenseCategory].label}
            </button>
          ))}
        </div>
      )}

      {/* Transaction list */}
      {loading ? (
        <div className="card p-6 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 && total === 0 ? (
        <EmptyState onImport={() => setShowImport(true)} />
      ) : transactions.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[#64748B] text-sm">No transactions match this filter.</p>
          <button onClick={() => setFilter('ALL')} className="text-[#2563EB] text-sm underline mt-2">Clear filter</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div
            className="grid grid-cols-12 gap-3 px-5 py-3 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wide"
            style={{ background: '#F8FAFF', borderBottom: '1px solid var(--border)' }}
          >
            <span className="col-span-2">Date</span>
            <span className="col-span-4">Merchant</span>
            <span className="col-span-2">Amount</span>
            <span className="col-span-2">Category</span>
            <span className="col-span-2">Confidence</span>
          </div>

          {/* Rows */}
          <div>
            {transactions.map((tx) => {
              const effectiveCategory = tx.userCategory ?? tx.category;
              const isLowConf = tx.confidence < 60 && !tx.userCategory;

              return (
                <div
                  key={tx.id}
                  className={cn(
                    'grid grid-cols-12 gap-3 px-5 py-3.5 items-center border-b last:border-0 group transition-colors',
                    isLowConf ? 'bg-[#FFFBEB]' : 'hover:bg-[#F8FAFF]',
                  )}
                  style={{ borderColor: 'var(--border)' }}
                >
                  {/* Date */}
                  <div className="col-span-2">
                    <span className="text-xs text-[#64748B] tabular-nums">
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Merchant */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <WhyPopover explanation={tx.explanation} category={effectiveCategory} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] truncate">{tx.normalizedName}</p>
                        {tx.rawDescription !== tx.normalizedName && (
                          <p className="text-[10px] text-[#94A3B8] truncate">{tx.rawDescription}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="col-span-2">
                    <span className="text-sm font-bold text-[#0F172A] tabular-nums">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>

                  {/* Category + correction */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CategoryBadge category={effectiveCategory} />
                      {tx.userCategory && (
                        <span className="text-[9px] text-[#6366F1] font-bold">edited</span>
                      )}
                    </div>
                  </div>

                  {/* Confidence + correct button */}
                  <div className="col-span-2 flex items-center justify-between gap-2">
                    <ConfidenceBar
                      confidence={tx.userCategory ? 99 : tx.confidence}
                      classifiedBy={tx.userCategory ? 'USER_RULE' : tx.classifiedBy}
                    />
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <CategoryCorrector
                        txId={tx.id}
                        currentCategory={effectiveCategory}
                        onCorrected={(newCat) => handleCategoryCorrection(tx.id, newCat)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border)', background: '#F8FAFF' }}
            >
              <p className="text-xs text-[#64748B]">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm"
                  style={{ opacity: page === 1 ? 0.4 : 1 }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * LIMIT >= total}
                  className="btn btn-secondary btn-sm"
                  style={{ opacity: page * LIMIT >= total ? 0.4 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Import modal (reusing existing but with direct pipeline) */}
      {showImport && (
        <CSVImportPipelineModal
          onClose={() => setShowImport(false)}
          onImport={handleCSVImport}
        />
      )}
    </div>
  );
}

// ─── Full-pipeline CSV import modal ──────────────────────────────────────────

function CSVImportPipelineModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (csvText: string) => Promise<void>;
}) {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ rowCount: number } | null>(null);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(csv|txt|xlsx|xls)$/i)) {
      setError('Please upload a .csv or .xlsx file exported from your bank.');
      return;
    }
    setLoading(true);
    setError(null);

    const isExcel = f.name.match(/\.(xlsx|xls)$/i);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let csvOutput: string;

        if (isExcel) {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          // Use the first sheet
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          csvOutput = XLSX.utils.sheet_to_csv(sheet);
        } else {
          csvOutput = e.target?.result as string;
        }

        const lines = csvOutput.trim().split('\n').filter(Boolean);
        setCsvText(csvOutput);
        setFileName(f.name);
        setPreview({ rowCount: Math.max(0, lines.length - 1) });
      } catch {
        setError('Could not read this file. Make sure it is a valid .csv or .xlsx export from your bank.');
      } finally {
        setLoading(false);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(f);
    } else {
      reader.readAsText(f);
    }
  };

  const handleImport = async () => {
    if (!csvText) return;
    setLoading(true);
    try {
      await onImport(csvText);
    } catch {
      setError('Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-lg animate-fade-in">
        <div className="px-6 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="heading-section">Import bank transactions</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Every transaction will be auto-categorized and explained.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F1F5F9', color: '#94A3B8' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* What happens */}
          <div className="rounded-lg p-4 space-y-2" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <p className="text-xs font-bold text-[#0369A1]">What happens after import:</p>
            <div className="space-y-1.5">
              {[
                'Merchant names are cleaned from bank noise ("AMZN Mktp US*1234" → "Amazon")',
                'Every transaction is classified into one of 9 categories with an explanation',
                'Low-confidence items are flagged for your review',
                'Duplicates from previous imports are automatically skipped',
                'Your expense breakdown in Analytics updates automatically',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <svg className="text-[#0284C7] shrink-0 mt-0.5" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-xs text-[#0369A1]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          {!preview ? (
            <label
              className="rounded-xl border-2 border-dashed flex flex-col items-center gap-3 py-8 cursor-pointer transition-colors hover:border-[#6366F1]"
              style={{ borderColor: '#CBD5E1', background: '#F8FAFF' }}
            >
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <div className="icon-box icon-box-sm icon-box-blue">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#0F172A]">Click to choose a CSV or Excel file</p>
                <p className="text-xs text-[#64748B] mt-1">CSV or Excel (.xlsx) from Chase, BofA, Capital One, or any bank</p>
              </div>
            </label>
          ) : (
            <div className="rounded-xl p-4" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div className="flex items-center gap-3">
                <svg className="text-[#059669]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-[#065F46]">{fileName}</p>
                  <p className="text-xs text-[#059669]">{preview.rowCount} transactions detected, ready to classify</p>
                </div>
                <button onClick={() => { setCsvText(null); setPreview(null); setFileName(null); }} className="ml-auto text-xs text-[#64748B] underline">
                  Change
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg p-3" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
              <p className="text-xs text-[#991B1B]">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button
            onClick={handleImport}
            disabled={!preview || loading}
            className="btn btn-primary flex-1"
            style={{ opacity: !preview || loading ? 0.5 : 1 }}
          >
            {loading ? 'Classifying transactions...' : `Classify & import ${preview ? preview.rowCount : 0} transactions`}
          </button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}
