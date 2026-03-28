'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinancialInputs, SimulatorSliders, FinancialProjection, InsightResult } from '@/types';
import { calculateProjection, assessFinancialHealth, type HealthStatus } from '@/engine/calculator';
import { evaluateRules } from '@/engine/insights';

interface FinancialState {
  inputs: FinancialInputs;
  sliders: SimulatorSliders;
  projection: FinancialProjection;
  ruleInsight: InsightResult | null;
  healthStatus: HealthStatus;
  aiInsight: string | null;
  aiLoading: boolean;
  isHydrated: boolean;

  // Actions
  updateInputs: (partial: Partial<FinancialInputs>) => void;
  updateSliders: (partial: Partial<SimulatorSliders>) => void;
  resetSliders: () => void;
  setAiInsight: (insight: string | null) => void;
  setAiLoading: (loading: boolean) => void;
  setHydrated: () => void;
  syncFromProfile: (profile: Partial<FinancialInputs>) => void;
}

const DEFAULT_INPUTS: FinancialInputs = {
  monthlyIncome: 4000,
  monthlyExpenses: 3200,
  currentSavings: 800,
  debtBalance: 6000,
  debtMonthlyPayment: 150,
  debtAnnualRate: 0.18,
  goalName: 'Emergency Fund',
  goalAmount: 3000,
  monthlyInvestment: 0,
  investmentBalance: 0,
};

const DEFAULT_SLIDERS: SimulatorSliders = {
  spendingReduction: 0,
  extraDebtPayment: 0,
  extraSavings: 0,
  extraInvestment: 0,
};

function deriveState(inputs: FinancialInputs, sliders: SimulatorSliders) {
  const projection = calculateProjection(inputs, sliders);
  const healthStatus = assessFinancialHealth(projection, inputs);
  const ruleInsight = evaluateRules(inputs, projection);
  return { projection, healthStatus, ruleInsight };
}

const initialProjection = calculateProjection(DEFAULT_INPUTS, DEFAULT_SLIDERS);

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      inputs: DEFAULT_INPUTS,
      sliders: DEFAULT_SLIDERS,
      projection: initialProjection,
      ruleInsight: evaluateRules(DEFAULT_INPUTS, initialProjection),
      healthStatus: assessFinancialHealth(initialProjection, DEFAULT_INPUTS),
      aiInsight: null,
      aiLoading: false,
      isHydrated: false,

      updateInputs: (partial) => {
        const newInputs = { ...get().inputs, ...partial };
        const derived = deriveState(newInputs, get().sliders);
        set({ inputs: newInputs, ...derived });
      },

      updateSliders: (partial) => {
        const newSliders = { ...get().sliders, ...partial };
        const derived = deriveState(get().inputs, newSliders);
        set({ sliders: newSliders, ...derived });
      },

      resetSliders: () => {
        const derived = deriveState(get().inputs, DEFAULT_SLIDERS);
        set({ sliders: DEFAULT_SLIDERS, ...derived });
      },

      setAiInsight: (insight) => set({ aiInsight: insight }),
      setAiLoading: (loading) => set({ aiLoading: loading }),
      setHydrated: () => set({ isHydrated: true }),

      syncFromProfile: (profile) => {
        const newInputs = { ...get().inputs, ...profile };
        const derived = deriveState(newInputs, get().sliders);
        set({ inputs: newInputs, ...derived });
      },
    }),
    {
      name: 'futureyou-financial',
      partialize: (state) => ({
        inputs: state.inputs,
        sliders: state.sliders,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const derived = deriveState(state.inputs, state.sliders);
          Object.assign(state, derived);
          state.isHydrated = true;
        }
      },
    }
  )
);
