'use client';

import { useState, useRef } from 'react';
import type { FinancialInputs } from '@/types';

interface ParsedData {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  debtBalance?: number;
  debtMonthlyPayment?: number;
  currentSavings?: number;
  monthlyInvestment?: number;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): ParsedData {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const result: ParsedData = {};

  // Try to detect if it's a bank statement (rows of transactions) or a config file (key,value)
  const hasHeader = lines[0].toLowerCase().includes('income') ||
                    lines[0].toLowerCase().includes('amount') ||
                    lines[0].toLowerCase().includes('category');

  if (!hasHeader) return result;

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('value'));
  const categoryIdx = headers.findIndex((h) => h.includes('category') || h.includes('type') || h.includes('name'));

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalDebt = 0;
  let totalSavings = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/[^0-9.-]/g, ''));
    const amount = amountIdx >= 0 ? Math.abs(parseFloat(cols[amountIdx]) || 0) : 0;
    const category = categoryIdx >= 0 ? lines[i].split(',')[categoryIdx]?.toLowerCase() ?? '' : '';

    if (category.includes('income') || category.includes('salary') || category.includes('wage')) {
      totalIncome += amount;
    } else if (category.includes('debt') || category.includes('loan') || category.includes('credit')) {
      totalDebt += amount;
    } else if (category.includes('saving') || category.includes('emergency')) {
      totalSavings += amount;
    } else {
      totalExpenses += amount;
    }
  }

  // Only set values that were actually found
  if (totalIncome > 0) result.monthlyIncome = Math.round(totalIncome);
  if (totalExpenses > 0) result.monthlyExpenses = Math.round(totalExpenses);
  if (totalDebt > 0) result.debtBalance = Math.round(totalDebt);
  if (totalSavings > 0) result.currentSavings = Math.round(totalSavings);

  return result;
}

// ─── Template CSV download ────────────────────────────────────────────────────

function downloadTemplate() {
  const csv = [
    'Category,Amount,Notes',
    'Income,5000,Monthly take-home salary',
    'Expenses,3200,Total monthly expenses',
    'Debt Balance,8000,Total debt owed',
    'Debt Payment,200,Monthly debt payment',
    'Savings,2000,Current savings balance',
    'Investment,300,Monthly investment contribution',
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'futureyou-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface CSVImportModalProps {
  onClose: () => void;
  onImport: (data: Partial<FinancialInputs>) => void;
}

export function CSVImportModal({ onClose, onImport }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv') && !f.name.endsWith('.txt')) {
      setError('Please upload a .csv file. Excel files must be saved as CSV first (File → Save As → CSV).');
      return;
    }
    setError(null);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        const keys = Object.keys(data);
        if (keys.length === 0) {
          setError('No recognizable financial data found. Download the template below to see the expected format.');
          setParsed(null);
        } else {
          setParsed(data);
          setFile(f);
        }
      } catch {
        setError('Could not read this file. Download the template to see the correct format.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = () => {
    if (!parsed) return;
    onImport(parsed);
  };

  const FIELD_LABELS: Record<keyof ParsedData, string> = {
    monthlyIncome: 'Monthly Income',
    monthlyExpenses: 'Monthly Expenses',
    debtBalance: 'Debt Balance',
    debtMonthlyPayment: 'Monthly Debt Payment',
    currentSavings: 'Current Savings',
    monthlyInvestment: 'Monthly Investment',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-lg animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="heading-section">Import from CSV</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Upload a CSV file with your financial data to auto-populate your plan.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#94A3B8', background: '#F1F5F9' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          {!parsed && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-colors"
              style={{ borderColor: '#CBD5E1', background: '#F8FAFF' }}
            >
              <div className="icon-box icon-box-lg icon-box-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#0F172A]">Drop a CSV file here or click to browse</p>
                <p className="text-xs text-[#64748B] mt-1">Supports .csv files. Export from Excel by: File → Save As → CSV.</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-4">
              <div className="skeleton h-4 w-3/4 mx-auto mb-2" />
              <div className="skeleton h-4 w-1/2 mx-auto" />
              <p className="text-xs text-[#64748B] mt-2">Reading your file...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg p-4" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
              <p className="text-sm font-semibold text-[#991B1B] mb-1">Could not parse this file</p>
              <p className="text-xs text-[#B91C1C]">{error}</p>
            </div>
          )}

          {/* Parsed preview */}
          {parsed && (
            <div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #BBF7D0', background: '#F0FDF4' }}>
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #BBF7D0' }}>
                  <svg className="text-[#059669]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-sm font-semibold text-[#065F46]">
                    {Object.keys(parsed).length} fields detected in <span className="font-bold">{file?.name}</span>
                  </p>
                </div>
                <div className="p-4 space-y-2">
                  {(Object.entries(parsed) as [keyof ParsedData, number][]).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-[#334155]">{FIELD_LABELS[key]}</span>
                      <span className="font-bold text-[#0F172A] tabular-nums">
                        ${value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-[#64748B] mt-3">
                These values will be merged into your plan. You can edit any field after importing.
              </p>
            </div>
          )}

          {/* Template download */}
          <div className="rounded-lg p-3 flex items-center justify-between gap-3" style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
            <div>
              <p className="text-xs font-semibold text-[#334155]">Need a template?</p>
              <p className="text-xs text-[#64748B]">Download a pre-formatted CSV you can fill in.</p>
            </div>
            <button onClick={downloadTemplate} className="btn btn-secondary btn-sm shrink-0 text-xs">
              Download template
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center gap-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button
            onClick={handleImport}
            disabled={!parsed}
            className="btn btn-primary flex-1"
            style={{ opacity: !parsed ? 0.5 : 1 }}
          >
            Import {parsed ? `${Object.keys(parsed).length} fields` : 'data'}
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
