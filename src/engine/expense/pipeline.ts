/**
 * Expense Intelligence Pipeline
 *
 * Orchestrates the full transformation:
 *   RawRow → Normalize → Classify → Deduplicate → ProcessedTransaction
 *
 * This is the single entry point for all data entering the system.
 * Every transaction must pass through this pipeline before storage.
 */

import { normalizeDescription, buildDedupeHash } from './normalization';
import { classifyTransaction, type UserRule, type ExpenseCategory, type ClassificationResult } from './classification';

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface RawTransactionRow {
  date: Date | string;
  amount: number;      // May be positive or negative depending on CSV format
  description: string;
  isDebit?: boolean;   // If not provided, inferred from amount sign
}

export interface ProcessedTransaction {
  date: Date;
  rawDescription: string;
  normalizedName: string;
  amount: number;               // Always positive
  isDebit: boolean;
  category: ExpenseCategory;
  subcategory?: string;
  confidence: number;
  explanation: string;
  classifiedBy: string;
  dedupeHash: string;
  importSource: string;
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────

export interface CSVParseResult {
  transactions: ProcessedTransaction[];
  skippedCount: number;         // Rows that couldn't be parsed
  lowConfidenceCount: number;   // Transactions with confidence < 60
  duplicateHashes: string[];    // Dedupe hashes that already exist (for UI to show)
  errors: string[];             // Non-fatal parse errors
}

/**
 * Parses a raw CSV string into processed transactions.
 * Supports multiple CSV formats automatically via header detection.
 */
export function parseCSVToTransactions(
  csvText: string,
  userRules: UserRule[] = [],
  existingHashes: Set<string> = new Set(),
  importSource = 'csv',
): CSVParseResult {
  const result: CSVParseResult = {
    transactions: [],
    skippedCount: 0,
    lowConfidenceCount: 0,
    duplicateHashes: [],
    errors: [],
  };

  const lines = csvText.trim().split('\n').filter((l) => l.trim());
  if (lines.length < 2) {
    result.errors.push('File appears to be empty or has only a header row.');
    return result;
  }

  // Parse header to detect column positions
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim());

  const dateIdx = findColumnIndex(headers, ['date', 'transaction date', 'posted date', 'post date', 'trans date']);
  const amountIdx = findColumnIndex(headers, ['amount', 'debit', 'credit', 'transaction amount', 'value']);
  const descIdx = findColumnIndex(headers, ['description', 'merchant', 'payee', 'transaction description', 'name', 'memo', 'details']);
  const typeIdx = findColumnIndex(headers, ['type', 'transaction type', 'debit/credit']);

  if (dateIdx === -1 || amountIdx === -1 || descIdx === -1) {
    result.errors.push(
      `Could not detect required columns. Found headers: [${headers.join(', ')}]. ` +
      `Need columns for: date, amount, and description/merchant.`
    );
    return result;
  }

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < Math.max(dateIdx, amountIdx, descIdx) + 1) {
      result.skippedCount++;
      continue;
    }

    // Parse date
    const rawDate = cols[dateIdx]?.trim();
    const date = parseDate(rawDate);
    if (!date) {
      result.skippedCount++;
      result.errors.push(`Row ${i + 1}: Could not parse date "${rawDate}" — skipped`);
      continue;
    }

    // Parse amount
    const rawAmount = cols[amountIdx]?.trim().replace(/[$,()]/g, '');
    const amount = Math.abs(parseFloat(rawAmount));
    if (isNaN(amount) || amount === 0) {
      result.skippedCount++;
      continue;
    }

    // Parse description
    const rawDescription = cols[descIdx]?.trim();
    if (!rawDescription) {
      result.skippedCount++;
      continue;
    }

    // Determine debit/credit
    let isDebit = true;
    if (typeIdx >= 0) {
      const typeVal = cols[typeIdx]?.toLowerCase().trim();
      isDebit = !typeVal?.includes('credit') && !typeVal?.includes('deposit') && !typeVal?.includes('payment received');
    } else {
      // Negative amounts in bank statements = debits (money leaving account)
      const rawAmountWithSign = cols[amountIdx]?.trim().replace(/[$,]/g, '');
      isDebit = parseFloat(rawAmountWithSign) < 0 || !rawAmountWithSign.startsWith('+');
    }

    // Skip income rows (non-debits) unless explicitly included
    // (Income is tracked via the financial profile, not transactions)
    if (!isDebit) {
      result.skippedCount++;
      continue;
    }

    // Normalization
    const normalizedName = normalizeDescription(rawDescription);

    // Classification
    const classification: ClassificationResult = classifyTransaction(
      normalizedName,
      rawDescription,
      amount,
      date,
      userRules,
    );

    // Deduplication
    const dedupeHash = buildDedupeHash(date, amount, normalizedName);
    if (existingHashes.has(dedupeHash)) {
      result.duplicateHashes.push(dedupeHash);
      continue; // Skip duplicate
    }

    if (classification.confidence < 60) {
      result.lowConfidenceCount++;
    }

    result.transactions.push({
      date,
      rawDescription,
      normalizedName,
      amount,
      isDebit,
      category: classification.category,
      subcategory: classification.subcategory,
      confidence: classification.confidence,
      explanation: classification.explanation,
      classifiedBy: classification.classifiedBy,
      dedupeHash,
      importSource,
    });
  }

  return result;
}

// ─── Single transaction processing ───────────────────────────────────────────

export function processTransaction(
  raw: RawTransactionRow,
  userRules: UserRule[] = [],
  importSource = 'manual',
): ProcessedTransaction {
  const date = raw.date instanceof Date ? raw.date : parseDate(String(raw.date)) ?? new Date();
  const amount = Math.abs(raw.amount);
  const isDebit = raw.isDebit ?? raw.amount > 0;

  const normalizedName = normalizeDescription(raw.description);
  const classification = classifyTransaction(normalizedName, raw.description, amount, date, userRules);
  const dedupeHash = buildDedupeHash(date, amount, normalizedName);

  return {
    date,
    rawDescription: raw.description,
    normalizedName,
    amount,
    isDebit,
    category: classification.category,
    subcategory: classification.subcategory,
    confidence: classification.confidence,
    explanation: classification.explanation,
    classifiedBy: classification.classifiedBy,
    dedupeHash,
    importSource,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((s) => s.replace(/^"|"$/g, ''));
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/,    // 2024-01-15
    /^(\d{2})\/(\d{2})\/(\d{4})/,   // 01/15/2024
    /^(\d{2})-(\d{2})-(\d{4})/,     // 01-15-2024
    /^(\d{2})\/(\d{2})\/(\d{2})/,   // 01/15/24
  ];

  for (const fmt of formats) {
    const m = str.match(fmt);
    if (m) {
      // Determine format type
      if (fmt.source.startsWith('^(\\d{4})')) {
        return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      } else {
        const year = parseInt(m[3]);
        return new Date(year < 100 ? 2000 + year : year, parseInt(m[1]) - 1, parseInt(m[2]));
      }
    }
  }

  // Try native Date parsing as fallback
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Monthly aggregate for Simulator insights ─────────────────────────────────

export interface MonthlyExpenseSummary {
  month: string;           // "2024-01"
  totalExpenses: number;
  byCategory: Record<string, number>;
}

export function computeMonthlyAverages(
  transactions: { date: Date | string; amount: number; category: string; userCategory?: string | null }[],
  monthsBack = 3,
): Record<string, number> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const categorySums: Record<string, number> = {};
  const monthSet = new Set<string>();

  for (const tx of transactions) {
    const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
    if (date < cutoff) continue;

    const cat = tx.userCategory ?? tx.category;
    categorySums[cat] = (categorySums[cat] ?? 0) + tx.amount;
    monthSet.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  const numMonths = Math.max(1, monthSet.size);
  const averages: Record<string, number> = {};
  for (const [cat, total] of Object.entries(categorySums)) {
    averages[cat] = Math.round(total / numMonths);
  }

  return averages;
}
