# FutureYou — Implementation Reference

**Version:** 2.0
**Last Updated:** 2026-03-28

This document records what was built, the decisions made during implementation, and the rationale behind them. It supersedes the original pre-build development plan.

---

## 1. What Was Built

FutureYou is a full-stack personal financial decision engine. The following features are implemented and production-ready.

### Application Pages

| Page | Route | Status | Key Functionality |
|---|---|---|---|
| Login | `/login` | Complete | Credentials authentication, NextAuth v5, frosted card layout |
| Register | `/register` | Complete | Account creation, password rules checklist, confirm password field |
| Onboarding | `/onboarding` | Complete | 4-step wizard, emerald color system, step-gated progression |
| Dashboard | `/dashboard` | Complete | Health assessment, math-annotated metric cards, AI insight, hero slideshow |
| Plan | `/plan` | Complete | Full financial input form, syncs to database on save |
| Debt | `/debt` | Complete | Amortization table, three optimizer strategies, feasibility decomposition |
| Goals | `/goals` | Complete | Goal CRUD, savings rate card with formula tooltip, progress bars |
| Simulator | `/simulator` | Complete | Four sliders, before/after comparison table, live projection |
| Insights | `/insights` | Complete | Rule-based and AI insight history, dismiss controls, persistence |
| Analytics | `/analytics` | Complete | Four charts, four stat cards with tooltips, CSV export, print report |
| History | `/history` | Complete | Saved snapshots, trend comparison across time periods |
| Transactions | `/transactions` | Complete | CSV import, deduplication, classification with confidence scores |
| Settings | `/settings` | Complete | Currency, locale, return rate assumptions, notification preferences |
| Profile | `/profile` | Complete | Account management, financial profile editing |

### Financial Engine Modules

| Module | File | Status | Description |
|---|---|---|---|
| Calculator | `src/engine/calculator.ts` | Complete | Projection, amortization, future value, health assessment |
| Insights | `src/engine/insights.ts` | Complete | Rule engine, AI prompt builder |
| Optimizer | `src/engine/optimizer.ts` | Complete | Strategy generation, binary search for target payment, feasibility decomposition |
| Classification | `src/engine/expense/classification.ts` | Complete | Transaction category classifier with confidence scoring |
| Normalization | `src/engine/expense/normalization.ts` | Complete | Merchant name normalizer |
| Pipeline | `src/engine/expense/pipeline.ts` | Complete | End-to-end import pipeline with deduplication |

### API Routes

| Route | Methods | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler |
| `/api/auth/register` | POST | Account creation |
| `/api/ai/insights` | POST | Server-side AI insight generation |
| `/api/goals` | GET, POST | Goal listing and creation |
| `/api/goals/[id]` | PATCH, DELETE | Goal update and deletion |
| `/api/scenarios` | GET, POST | Scenario save and retrieval |
| `/api/strategies` | GET, POST | Strategy generation and retrieval |
| `/api/transactions` | GET, POST | Transaction listing and manual creation |
| `/api/transactions/import` | POST | CSV import with classification pipeline |
| `/api/transactions/analytics` | GET | Aggregated spending analytics |
| `/api/transactions/[id]` | PATCH, DELETE | Transaction update and deletion |
| `/api/expense-rules` | GET, POST, DELETE | User-defined classification rules |
| `/api/profile` | GET, PATCH | Financial profile read and update |
| `/api/settings` | GET, PATCH | User settings read and update |
| `/api/onboarding` | POST | Onboarding step persistence |

---

## 2. Engine Implementation Details

### 2.1 Projection Engine

`calculateProjection(inputs, sliders?)` is the primary entry point. It:

1. Applies simulator slider values to base inputs if sliders are provided
2. Computes gross monthly remaining (`income - expenses`)
3. Computes net surplus (`income - expenses - debtPayment - investment`)
4. Computes savings rate (`(income - expenses) / income`)
5. Runs `simulateLoan` for baseline and simulated debt payoff
6. Computes goal timelines for baseline and simulated scenarios
7. Computes emergency fund coverage in months
8. Computes debt-to-income ratio
9. Computes investment projections for 10, 20, and 30 years across three return rates
10. Sets transition flags (`debtBecamePayable`, `goalBecameAchievable`, etc.)

The function returns a complete `FinancialProjection` object. All downstream components derive their data from this single object.

### 2.2 Key Mathematical Formulas

**Future value of annuity (monthly contributions):**
```
FV = PMT x (((1 + r/12)^(years * 12)) - 1) / (r/12)
```
where `r` is the annual rate and `PMT` is the monthly contribution.

**Future value of lump sum:**
```
FV = P x (1 + r/12)^(years * 12)
```

**Net surplus (used for goal timelines and dashboard display):**
```
netSurplus = income - expenses - debtMonthlyPayment - monthlyInvestment
```

**Savings rate (used for the Goals savings rate card):**
```
savingsRate = (income - expenses) / income
```

Note: the savings rate formula uses gross surplus (before debt and investments) to align with standard personal finance benchmarks of 15-20%.

**Loan amortization (month-by-month):**
```
for each month:
  interest = balance x (annualRate / 12)
  principal = payment - interest
  balance = balance - principal
```
`simulateLoan` is the authoritative source for interest calculations throughout the application.

### 2.3 Rule Engine Priority

`evaluateRules` returns the highest-priority triggered rule. Rules are evaluated in order:

```
1. CRITICAL — netSurplus < 0
2. HIGH     — debtAnnualRate > 0.15 and debtBalance > 0
3. HIGH     — emergencyFundMonths < 1
4. MEDIUM   — savingsRate < 0.10
5. MEDIUM   — monthlyInvestment = 0
6. LOW      — all clear
```

Each rule produces an `InsightResult` with `category`, `action`, `reason`, and `outcome` fields in plain language.

### 2.4 Optimizer Strategy Generation

`generateStrategies` produces three strategies:

| Strategy | Label | Method |
|---|---|---|
| Reduce Spending | Reduce spending by 30% | Uses 30% of current expenses as target reduction |
| Boost Payments | Boost monthly payment by 50% | Uses `findPaymentForTarget` to compute required payment |
| Combined | Combined approach | Splits the required extra payment between spending cuts and payment increase |

`findPaymentForTarget(balance, annualRate, targetMonths)` uses binary search to find the exact monthly payment that achieves the target payoff timeline. This replaced an earlier implementation that used arbitrary fractions without computing the actual required payment.

---

## 3. Bugs Fixed During Implementation

The following mathematical errors were identified and corrected during the audit phase.

| ID | Location | Description | Fix Applied |
|---|---|---|---|
| Bug-01 | `insights.ts` | `estInterestSaved` used the original total interest instead of the difference after the new payment | Changed to `Math.max(0, totalInterest - calcTotalInterest(balance, newPayment, rate))` |
| Bug-02 | `insights.ts` | `freeSurplus` did not deduct the existing debt payment and investment before computing `extraPayment` | Added explicit deduction of `debtMonthlyPayment` and `monthlyInvestment` |
| Bug-03 | `insights.ts` | Emergency fund months calculation used `monthlyRemaining` (gross) instead of `monthlySurplus` (net) | Changed to `monthlySurplus = Math.max(0, netSurplus)` |
| Bug-04 | `insights.ts` | Investment projection used hardcoded arithmetic (`200 * 12 * 20 * 2`) instead of compound interest formula | Replaced with `futureValueAnnuity(200, 0.07, 20)` |
| Bug-05 | `optimizer.ts` | `newTotalInterest` computed without running amortization | Changed to call `simulateLoan(balance, newPayment, rate).totalInterest` |
| Bug-06 | `optimizer.ts` | Strategy generation used arbitrary fractions to determine required payment; `findPaymentForTarget` was never called | Refactored to call `findPaymentForTarget` and pass the result into `buildStrategy` |
| Bug-07 | `utils.ts` | `formatMonths` rounding edge case: 11.5 months rounded to 12 months but was not promoted to 1 year 0 months | Added explicit check for `remainingMonths === 12` after rounding |
| Bug-08 | `InsightsClient.tsx` | `buildMetrics` used `projection.monthlyRemaining` (gross) where `projection.netSurplus` was the correct value | Changed to `const surplus = projection.netSurplus` |
| Bug-09 | `GoalsClient.tsx` | Surplus for goal timeline was manually recomputed from raw inputs instead of using `projection.netSurplus` | Changed to `const surplus = Math.max(0, projection.netSurplus)` |
| Bug-10 | `simulator/page.tsx` | After-simulator surplus formula omitted the `spendingReduction` contribution | Changed to `projection.netSurplus + sliders.spendingReduction - sliders.extraDebtPayment - sliders.extraInvestment` |

---

## 4. UI Implementation Decisions

### 4.1 Math Tooltips

Math tooltips are implemented on the Dashboard metric cards (`MathTooltip` component) and the Analytics stat cards (`StatCard` component). Each tooltip shows the actual formula with real values substituted, so the user can verify any displayed number.

Tooltip style:
- Background: `#f0fdf4` (light green)
- Border: `rgba(22,163,74,0.2)`
- Text: dark emerald (`#166534`, `#14532d`)
- Result row: `#15803d` (bold)

The analytics stat card grid is given `position: relative; z-index: 10` to ensure tooltips render above the chart sections below. This is necessary because `backdrop-filter: blur()` on each card creates a new stacking context, and without an elevated z-index on the grid container, the chart section's stacking context takes precedence.

### 4.2 Color System

All colors are defined as CSS custom properties. The application uses an emerald green primary (`var(--primary)` = `#16a34a`) with a gradient sidebar and header.

Blue was removed from the onboarding page in the final pass to unify the color system. The sidebar gradient, debt toggle, goal cards, step labels, and skip-hover colors were all changed to emerald CSS variable references.

### 4.3 Authentication Pages

The login and register pages were redesigned with:
- Centered white card on a periwinkle gradient background
- Icon-prefixed input fields
- Eye toggle for password visibility
- Password criteria checklist (always visible on register page)
- Confirm password field with green/red border feedback
- Security note and frosted footer bar

### 4.4 Sidebar Navigation Icons

| Route | Icon |
|---|---|
| Dashboard | House |
| Plan | Clipboard |
| Debt | Dollar sign with strike-through |
| Goals | Concentric circles (target) |
| Insights | Lightbulb |
| Simulator | Sliders |
| Analytics | Bar chart |
| History | Clock |
| Transactions | Receipt |
| Settings | Gear |

---

## 5. Deferred Features

The following were considered during planning and explicitly deferred.

| Feature | Reason Deferred |
|---|---|
| Bank account integration (Plaid) | Requires OAuth, webhook handling, and additional compliance considerations |
| Native mobile application | Requires separate React Native codebase; web-first approach sufficient for MVP |
| Scenario side-by-side comparison | Requires additional UI surface area; saved scenarios in History provide partial coverage |
| Inflation adjustment | Would require user-facing explanation of real vs. nominal values; out of scope for MVP |
| Streaming AI responses | Adds implementation complexity with marginal UX benefit at current response lengths (200 tokens) |
| Multi-goal priority ordering | Goals page supports multiple goals; automatic surplus allocation deferred |
| Shared household planning | Requires multi-user data model changes |

---

## 6. Performance Outcomes

All performance targets from the original plan were met.

| Requirement | Target | Outcome |
|---|---|---|
| `calculateProjection` execution time | < 5ms | Achieved; measured at < 2ms on typical inputs |
| UI re-render on slider change | < 16ms (one frame at 60fps) | Achieved; no perceptible lag on slider interaction |
| No network calls in core loop | Mandatory | Achieved; all slider updates are fully synchronous |
| AI debounce delay | >= 800ms | Implemented at 800ms |
| AI layer never blocks rendering | Mandatory | Achieved; AI call is fire-and-forget with independent state update |
| TypeScript build | Zero errors | Achieved; `tsc --noEmit` passes cleanly |

---

## 7. Implementation Order (Actual)

The system was built in the following order, which differed from the original parallel track plan due to the decision to use Next.js App Router with a database from the outset.

1. Project scaffolding — Next.js 14, TypeScript strict, Tailwind, Prisma, NextAuth
2. Database schema — all models defined in `schema.prisma`
3. Authentication — login, register, middleware, session
4. Onboarding wizard — 4-step flow with database persistence
5. Financial engine — `calculator.ts` with all pure functions and unit verification
6. Zustand store — with localStorage persistence and hydration guard
7. Dashboard — metric cards, health assessment, hero slideshow
8. Plan page — financial input form with database sync
9. Simulator — four sliders, before/after table, live projection
10. Debt page — amortization, optimizer, strategy cards
11. Goals page — CRUD, savings rate card, progress tracking
12. Insights page — rule engine integration, AI layer, history
13. Analytics page — charts, stat cards, export
14. History page — snapshots, trend display
15. Transactions page — CSV import, classification pipeline
16. Settings and Profile pages
17. Mathematical audit — bugs 1-10 identified and fixed
18. UI polish — math tooltips, auth page redesign, onboarding color unification, lightbulb icon
19. Documentation

---

*End of Document*
