# FutureYou — Personal Financial Decision Engine

**Version:** 1.0
**Stack:** Next.js 14 · TypeScript · PostgreSQL · Prisma · Zustand · NextAuth v5
**Status:** Production-ready

---

## Overview

FutureYou is a personal financial decision engine. It is not a budgeting app, a spending tracker, or a retrospective dashboard. It takes a user's current financial situation and models the direct consequences of their decisions in real time — before those decisions are made.

Every feature answers one question: **What happens to my financial future if I change this behavior today?**

---

## The Problem

Most personal finance tools are backward-looking. They display charts of what you have already spent and expect users to draw their own conclusions. This creates two compounding problems:

| Problem | Effect |
|---|---|
| Data without guidance | Users see charts but do not know what to do next |
| Retrospective framing | Information about the past has limited value at the moment of decision |

The result is that people make financial decisions without understanding the consequences of those decisions until months later, when the damage is already done.

---

## The Solution

FutureYou replaces passive data display with active decision modeling. The system follows a single repeating loop:

```
DECISION  -->  CONSEQUENCE  -->  ACTION
```

| Stage | Description | Example |
|---|---|---|
| Decision | User expresses a change in financial behavior | Move a slider: "What if I spend $100 less per month?" |
| Consequence | System computes the projected outcome instantly | "Your goal is reached 4 months sooner." |
| Action | System tells the user exactly what to do next | "Redirect $100 from dining to your emergency fund." |

---

## What the System Does

| User Action | Immediate System Response |
|---|---|
| Reduces monthly spending by $100 | Goal timeline shortens; net surplus increases; debt payoff accelerates |
| Increases debt payment by $100/month | Payoff date moves earlier; total interest paid decreases |
| Starts investing $150/month | 10/20/30-year projections update across three return scenarios |
| Changes income or expense values | Every downstream metric recalculates within a single render cycle |
| Saves a simulator scenario | Scenario is persisted to the database and accessible in history |

---

## Application Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Financial health overview, AI insight, math-annotated metric cards, hero slideshow |
| Plan | `/plan` | Full financial input form for income, expenses, debt, and investments |
| Debt | `/debt` | Debt analysis, three optimizer strategies, amortization table |
| Goals | `/goals` | Goal management, savings rate card with formula breakdown, progress tracking |
| Simulator | `/simulator` | Interactive what-if modeling with four sliders and before/after comparison |
| Insights | `/insights` | Rule-based and AI-generated insight cards with history and dismiss controls |
| Analytics | `/analytics` | Stat cards with tooltips, four charts, CSV export, print report |
| History | `/history` | Saved financial snapshots with trend comparison |
| Transactions | `/transactions` | CSV import, classified transaction listing, category correction |
| Settings | `/settings` | Currency, locale, return rate assumptions, notification preferences |
| Profile | `/profile` | Account management and financial profile editing |

---

## Financial Engine

All calculations are pure functions with no side effects. The engine runs synchronously on the client and produces outputs in under 5ms.

### Core Functions

| Function | Signature | Description |
|---|---|---|
| `calculateProjection` | `(inputs, sliders?) -> FinancialProjection` | Primary projection engine. Computes all downstream financial metrics from a set of inputs and optional simulator adjustments. |
| `futureValueAnnuity` | `(monthlyContribution, annualRate, years) -> number` | Compound growth of regular monthly contributions. Used for investment projections. |
| `futureValueLumpSum` | `(principal, annualRate, years) -> number` | Compound growth of an existing investment balance. |
| `simulateLoan` | `(balance, monthlyPayment, annualRate) -> { months, totalInterest }` | Month-by-month amortization simulation. Authoritative source for interest calculations. |
| `calcTotalInterest` | `(balance, monthlyPayment, annualRate) -> number` | Total interest paid over the full life of a loan. |
| `assessFinancialHealth` | `(projection, inputs) -> HealthStatus` | Returns `strong`, `healthy`, `attention`, or `critical` based on four weighted metrics. |
| `generateStrategies` | `(inputs) -> OptimizationResult[]` | Produces three ranked debt payoff strategies with feasibility decomposition. |
| `evaluateRules` | `(inputs, projection) -> InsightResult` | Synchronous rule engine. Evaluates current financial state against a priority hierarchy and returns one categorized recommendation. |

### Projection Output

```
FinancialProjection {
  monthlyRemaining     // Income minus expenses (gross)
  netSurplus           // Income minus expenses, debt, and investments (true free cash)
  savingsRate          // (Income minus Expenses) divided by Income
  debtToIncomeRatio    // Monthly debt payment divided by monthly income
  emergencyFundMonths  // Current savings divided by monthly expenses

  goalTimelineMonths      // Months to goal at current rate
  simulatedGoalMonths     // Months to goal with simulator adjustments applied
  goalTimeDelta           // Difference (negative = faster)

  debtPayoffMonths        // Months to debt freedom at current payment
  simulatedDebtMonths     // Months to debt freedom with extra payment applied
  debtTimeDelta           // Difference
  totalInterest           // Total interest at current payment rate
  interestSaved           // Interest avoided with extra payment applied

  investments.tenYear     // { conservative, moderate, optimistic }
  investments.twentyYear
  investments.thirtyYear
}
```

### Investment Return Rate Assumptions

| Scenario | Annual Rate | Use |
|---|---|---|
| Conservative | 5.0% | Lower bound for projections |
| Moderate | 7.0% | Default projection displayed |
| Optimistic | 9.0% | Upper bound for projections |

---

## Insight System

The insight system operates in two layers. Both are non-blocking and do not delay the rendering of core financial data.

```
User Input / Slider Change
         |
         +----> Rule Engine (synchronous, < 5ms) ----> Instant insight card update
         |
         +----> Debounce timer (800ms)
                      |
                      v
               AI API call (async, server-side) ----> Insight card refreshes on response
```

### Rule Engine Priority Hierarchy

| Priority | Condition | Category |
|---|---|---|
| CRITICAL | Monthly net surplus is negative | Deficit |
| HIGH | Debt APR exceeds 15% | High-interest debt |
| HIGH | Emergency fund below 1 month of expenses | Emergency fund gap |
| MEDIUM | Savings rate below 10% | Low savings rate |
| MEDIUM | Monthly investment is zero | Not investing |
| LOW | All metrics within healthy ranges | On track |

### AI Layer

The AI layer uses Claude Haiku 4.5 via a server-side API route. The key is never exposed to the browser. The AI receives the full financial context including the rule-based insight and returns a 2-3 sentence personalized recommendation. If the API is unavailable, the rule-based insight remains visible and the system degrades gracefully.

---

## State Management

State is managed by a Zustand store (`useFinancialStore`) that persists inputs and simulator sliders to `localStorage`. Derived state — projections, health status, and insights — is recomputed on every hydration and input change.

```
Store {
  inputs: FinancialInputs         // Persisted to localStorage
  sliders: SimulatorSliders       // Persisted to localStorage
  aiInsight: string | null        // Session only
  aiLoading: boolean              // Session only
  hydrated: boolean               // Lifecycle flag
}
```

The store exposes `updateInputs`, `updateSliders`, `resetSliders`, `syncFromProfile`, `setAiInsight`, and `setAiLoading`. All projection values are derived by calling `calculateProjection(inputs, sliders)` within consuming components rather than being stored in state.

---

## Data Model

### Core Tables

| Table | Purpose |
|---|---|
| `User` | Account record, authentication, onboarding state |
| `FinancialProfile` | Persisted financial inputs synced from the Plan page |
| `Goal` | User-defined financial goals with type, status, and target amount |
| `Scenario` | Saved simulator configurations with projected outcomes |
| `Strategy` | Generated debt payoff strategies with feasibility metadata |
| `Insight` | Historical record of rule-based and AI-generated insights |
| `Snapshot` | Point-in-time financial state snapshots for history and trend tracking |
| `Transaction` | Imported transactions with classification and deduplication |
| `ExpenseRule` | User-defined and system-defined transaction classification rules |
| `UserSettings` | Per-user preferences including return rate assumptions and locale |

### Goal Types

`EMERGENCY_FUND` · `DEBT_PAYOFF` · `HOME_PURCHASE` · `INVESTMENT` · `TRAVEL` · `EDUCATION` · `RETIREMENT` · `CUSTOM`

### Transaction Classification Pipeline

Imported transactions pass through a three-stage pipeline:

```
Raw CSV Row
     |
     v
Normalization  -- Strips merchant codes, cleans whitespace, extracts amount/date
     |
     v
Classification -- Matches against ExpenseRule table (user rules, system rules, keyword patterns)
     |
     v
Deduplication  -- SHA-256 hash of (date + amount + normalizedName) prevents duplicate imports
```

Classification confidence is stored as a 0-100 integer. Users can correct misclassified transactions, and corrections are recorded with a timestamp.

---

## Authentication

Authentication uses NextAuth v5 with a credentials provider. Sessions are JWT-based. The `NEXTAUTH_SECRET` environment variable is required for session signing.

Middleware at `src/middleware.ts` protects all routes under `/(app)` and `/(onboarding)`. Unauthenticated requests are redirected to `/login`.

---

## System Architecture

```
Browser
   |
   |-- Zustand Store (inputs, sliders)
   |-- calculateProjection() [synchronous, < 5ms]
   |-- UI Components [re-render only on changed state]
   |
   |-- POST /api/ai/insights [async, debounced 800ms]
   |-- POST /api/goals        [CRUD]
   |-- POST /api/scenarios    [CRUD]
   |-- POST /api/transactions [import + classify]
   |-- GET  /api/profile      [sync from database]
   |
Next.js Server
   |
   |-- Prisma ORM
   |
PostgreSQL
```

---

## Comparison

| Capability | Standard Finance App | FutureYou |
|---|---|---|
| Primary orientation | Past (tracking) | Future (projection) |
| User interaction model | Data entry and review | Decision simulation |
| Output | Historical charts | Forward-facing consequences |
| Insight delivery | Static category summaries | Prioritized, personalized recommendations |
| Update model | Periodic refresh | Synchronous on every input change |
| AI integration | None or cosmetic | Server-side, non-blocking, context-aware |

---

## Default Demo Data

The system loads with the following default inputs to demonstrate the core loop immediately on first use.

| Input | Default Value |
|---|---|
| Monthly income | $4,000 |
| Monthly expenses | $3,200 |
| Current savings | $800 |
| Debt balance | $6,000 at 18% APR |
| Monthly debt payment | $150 |
| Goal | Emergency Fund of $3,000 |
| Monthly investment | $0 |

Seeded demo account: `demo@futureyou.app` / `demo123456`

---

## Future Work

| Area | Description |
|---|---|
| Bank integration | Direct account connection via Plaid for automatic transaction import |
| Mobile application | Native iOS and Android apps optimized for in-the-moment decisions |
| Scenario comparison | Side-by-side view of two saved simulator configurations |
| Goal prioritization | Multi-goal management with ordered priority and automatic surplus allocation |
| Inflation adjustment | Apply a configurable inflation rate to long-term projections |
| Streaming AI responses | Progressive AI insight rendering using the streaming API |
| Shared financial plans | Collaborative planning for households and partners |
