'use client';

import { useEffect } from 'react';
import { useFinancialStore } from '@/stores/useFinancialStore';

/**
 * Fetches the latest financial profile from the DB and pushes it into the
 * Zustand store. Call this at the top of any page that relies on store-derived
 * projections (Debt, Goals, Simulator) so data is always current, even when
 * the user navigates directly to that page without passing through Dashboard.
 */
export function useSyncProfile() {
  const syncFromProfile = useFinancialStore((s) => s.syncFromProfile);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const p = data?.data;
        if (!p) return;
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
      })
      .catch(() => {/* non-critical — store values remain as fallback */});
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
