# FutureYou — System Architecture

**Version:** 1.0
**Last Updated:** 2026-03-28

---

## 1. System Overview

FutureYou is a full-stack personal financial decision engine built on Next.js 14 App Router. Its defining characteristic is a synchronous, client-side financial projection engine that recalculates a user's entire financial future within a single render frame whenever any input changes.

The system is organized around one loop:

```
DECISION  -->  CONSEQUENCE  -->  ACTION
```

Every architectural decision is evaluated against whether it supports or disrupts this loop.

---

## 2. High-Level Architecture

```
+------------------------------------------------------------------+
|                          BROWSER                                 |
|                                                                  |
|  +------------------+     +----------------------------------+   |
|  |  Zustand Store   |     |     Financial Engine             |   |
|  |  (inputs,        | --> |     calculateProjection()        |   |
|  |   sliders)       |     |     [synchronous, < 5ms]         |   |
|  +------------------+     +----------------------------------+   |
|           |                              |                       |
|           |                              v                       |
|           |               +----------------------------------+   |
|           |               |     UI Components                |   |
|           |               |     (re-render on change only)   |   |
|           |               +----------------------------------+   |
|           |                                                      |
|           |--- POST /api/ai/insights (async, 800ms debounce)     |
|           |--- POST /api/goals, /api/scenarios (on user action)  |
|           |--- GET  /api/profile (on page load)                  |
|                                                                  |
+------------------------------------------------------------------+
                              |
                    Next.js Server (API Routes)
                              |
                    +------------------+
                    |   Prisma ORM     |
                    +------------------+
                              |
                    +------------------+
                    |   PostgreSQL     |
                    +------------------+
```

Data flows in one direction. The Financial Engine is pure — given the same inputs, it always returns the same outputs. It holds no state and has no side effects.

---

## 3. Layer Responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| Client State | Zustand | Holds financial inputs and simulator sliders; persists to localStorage; exposes typed update functions |
| Financial Engine | TypeScript (pure functions) | Computes projections, amortization, strategies, and insights synchronously from state |
| UI | Next.js / React | Renders results reactively; re-renders only components whose inputs have changed |
| API Routes | Next.js Route Handlers | Handles authentication, database operations, and server-side AI calls |
| AI Layer | Inference API (server-side) | Generates personalized 2-3 sentence insight after an 800ms debounce; non-blocking |
| Database | PostgreSQL + Prisma | Persists user profiles, goals, snapshots, transactions, and settings |
| Authentication | NextAuth v5 | JWT sessions with credentials provider; route protection via middleware |

---

## 4. Data Flow

### 4.1 Synchronous Path (Core Loop)

The following sequence completes entirely within one browser render cycle. No network calls are permitted in this path.

```
[1] User Input (slider move or field change)
         |
         | (Zustand updateInputs or updateSliders)
         v
[2] Store State Updated
         |
         | (React re-renders consuming components)
         v
[3] calculateProjection(inputs, sliders) called inline
         |
         | (pure function, < 5ms)
         v
[4] FinancialProjection returned
         |
         | (passed as props to display components)
         v
[5] UI Updated — all metrics, charts, and timelines reflect new values
```

### 4.2 Asynchronous Path (AI Insight)

The AI path runs after the synchronous path has already rendered. It does not block any UI update.

```
[1] User stops interacting (800ms debounce elapses)
         |
         v
[2] POST /api/ai/insights
         |  body: { inputs, projection, ruleInsight }
         v
[3] Server authenticates request, calls Insights API
         |  max_tokens: 200
         v
[4] Personalized insight returned as plain text
         |
         v
[5] Insight card updates in place (non-blocking)
```

If the Insights API is unavailable, step 5 is skipped and the rule-based insight (rendered in step 5 of the synchronous path) remains visible.

### 4.3 Persistence Path (On User Action)

Database writes occur only when the user explicitly takes an action. They are never triggered automatically by slider moves or input changes.

```
User Action --> API Route --> Prisma --> PostgreSQL
```

| Action | API Route | Database Write |
|---|---|---|
| Save financial profile | POST /api/profile | Updates FinancialProfile |
| Add a goal | POST /api/goals | Creates Goal record |
| Save simulator scenario | POST /api/scenarios | Creates Scenario record |
| Import transactions | POST /api/transactions/import | Creates Transaction records |
| Complete onboarding step | POST /api/onboarding | Updates User and FinancialProfile |

---

## 5. Financial Engine Design

The engine is located in `src/engine/` and is composed of three modules. All functions are exported and individually testable.

### 5.1 calculator.ts

The primary projection module. Contains all mathematical models used across the application.

| Function | Input | Output | Notes |
|---|---|---|---|
| `calculateProjection` | `FinancialInputs`, `SimulatorSliders?` | `FinancialProjection` | Calls all other functions; entry point for the engine |
| `futureValueAnnuity` | `PMT`, `annualRate`, `years` | `number` | Standard future value of annuity with monthly compounding |
| `futureValueLumpSum` | `principal`, `annualRate`, `years` | `number` | Future value of a one-time deposit |
| `simulateLoan` | `balance`, `payment`, `annualRate` | `{ months, totalInterest }` | Month-by-month amortization; source of truth for interest |
| `calcTotalInterest` | `balance`, `payment`, `annualRate` | `number` | Wraps `simulateLoan.totalInterest` |
| `calcDebtPayoffMonths` | `balance`, `payment`, `annualRate` | `number` | Closed-form equivalent of `simulateLoan.months` |
| `calcSavingsMonths` | `currentSavings`, `contribution`, `target` | `number` | Linear savings timeline (no interest) |
| `assessFinancialHealth` | `FinancialProjection`, `FinancialInputs` | `HealthStatus` | Returns `strong`, `healthy`, `attention`, or `critical` |

**Investment return rate constants:**

| Scenario | Rate |
|---|---|
| Conservative | 5.0% annually |
| Moderate | 7.0% annually |
| Optimistic | 9.0% annually |

### 5.2 insights.ts

The insight module operates in two modes:

**Rule-based (synchronous):**
`evaluateRules(inputs, projection) -> InsightResult`

Evaluates the financial state against a priority hierarchy and returns a single categorized insight.

| Priority | Trigger Condition |
|---|---|
| CRITICAL | `netSurplus < 0` — expenses exceed income |
| HIGH | Debt APR > 15% and balance > 0 |
| HIGH | Emergency fund < 1 month of expenses |
| MEDIUM | Savings rate < 10% |
| MEDIUM | Monthly investment = 0 |
| LOW | All metrics within healthy thresholds |

**AI prompt builder:**
`buildAIPrompt(AIInsightRequest) -> string`

Constructs a structured prompt for the server-side AI call. Includes the user's full financial context and the rule-based insight so the AI can provide a more specific recommendation rather than repeating the same guidance.

### 5.3 optimizer.ts

Generates three named debt payoff strategies with feasibility decomposition.

| Function | Description |
|---|---|
| `generateStrategies(inputs)` | Returns up to three `OptimizationResult` objects: Reduce Spending, Boost Payments, and Combined |
| `findPaymentForTarget(balance, rate, targetMonths)` | Binary search to determine the exact monthly payment required to pay off debt within a given number of months |
| `decomposePaymentIncrease(required, inputs)` | Breaks down the required extra payment into human-readable sources (available surplus, investment reallocation, spending cuts, income gap) |

Each strategy includes:
- `status`: `feasible` | `infeasible` | `already_achieved` | `no_target`
- `isTotallyFeasible`: whether the required payment can be sourced from available funds
- `actions`: array of specific recommended changes with amounts and sources

---

## 6. State Management

### 6.1 Zustand Store

All client state is held in a single Zustand store (`src/stores/useFinancialStore.ts`).

```
Store Shape {
  inputs:    FinancialInputs      // Persisted to localStorage
  sliders:   SimulatorSliders     // Persisted to localStorage
  aiInsight: string | null        // Session only; not persisted
  aiLoading: boolean              // Session only
  hydrated:  boolean              // True after localStorage is read
}
```

The store uses Zustand's `persist` middleware with the key `'futureyou-financial'`. Only `inputs` and `sliders` are included in the persisted subset.

### 6.2 Why Projection Is Not in the Store

`FinancialProjection` is a derived value — it is a pure function of `inputs` and `sliders`. Storing it in state would create a synchronization problem: the store would need to be updated every time inputs change, and any consumer that reads the projection before the store update completes would see stale data.

Instead, every component that needs the projection calls `calculateProjection(inputs, sliders)` directly or receives it as a prop from a parent that does so. Because the function runs in under 5ms, this is cheaper than managing projection in state.

### 6.3 Persistence and Hydration

On first render, the store is in an unhydrated state. The `hydrated` flag is set to `true` once localStorage has been read. Components that display financial data should check this flag to avoid rendering stale default values before the user's persisted inputs are loaded.

---

## 7. Insight System Architecture

```
+------------------------------------------------------------+
|                    USER INTERACTION                        |
+------------------------------------------------------------+
         |                              |
         v                             (800ms debounce)
+------------------+                   |
|  Rule Engine     |                   v
|  evaluateRules() |          +------------------+
|  [synchronous]   |          |  AI API Call     |
|  < 5ms           |          |  [asynchronous]  |
+------------------+          +------------------+
         |                             |
         v                             v
+------------------+          +------------------+
|  Insight card    |          |  Insight card    |
|  updates         |          |  refreshes       |
|  immediately     |          |  when ready      |
+------------------+          +------------------+
```

### Behavioral Rules

| Rule | Requirement |
|---|---|
| The rule engine must never be awaited | Its result is available within the same render cycle as the input change |
| The AI layer must never block UI rendering | It runs after the synchronous path has already completed |
| AI calls must be debounced by 800ms minimum | Prevents API calls during active slider interaction |
| The UI must degrade gracefully if AI is unavailable | Rule-based insight remains visible; no error is shown |
| AI calls require an authenticated session | The route handler checks the session before making the API call |

---

## 8. Transaction Classification Pipeline

Imported CSV transactions pass through a three-stage pipeline before storage.

```
+--------------------+
|  Raw CSV Row       |
|  date, description |
|  amount            |
+--------------------+
         |
         v
+--------------------+
|  Normalization     |
|  - Strip merchant  |
|    suffix codes    |
|  - Normalize       |
|    whitespace      |
|  - Extract amount  |
|    sign (debit/    |
|    credit)         |
+--------------------+
         |
         v
+--------------------+
|  Classification    |
|  Priority order:   |
|  1. User rules     |
|  2. System rules   |
|  3. Keyword match  |
|  4. Pattern        |
|     inference      |
|  5. Fallback       |
|     (MISC)         |
+--------------------+
         |
         v
+--------------------+
|  Deduplication     |
|  SHA-256 hash of   |
|  (date + amount +  |
|   normalizedName)  |
|  Reject duplicates |
+--------------------+
         |
         v
+--------------------+
|  Transaction       |
|  record written    |
|  with confidence   |
|  score (0-100)     |
+--------------------+
```

Classification confidence is stored per transaction. Users can correct misclassifications, and corrections are recorded with a timestamp. User-defined rules take priority over all system rules on subsequent imports.

---

## 9. Authentication and Route Protection

NextAuth v5 is configured in `src/lib/auth.ts` with a credentials provider. Passwords are hashed with bcrypt before storage.

Route protection is enforced by `src/middleware.ts`, which runs on every request before the page renders.

```
Request arrives
      |
      v
middleware.ts checks NextAuth session
      |
      +-- Session valid --> Request proceeds
      |
      +-- Session invalid, route is /(app)/* --> Redirect to /login
      |
      +-- Session invalid, route is /(onboarding)/* --> Redirect to /login
      |
      +-- Session invalid, route is /(auth)/* --> Request proceeds (login/register)
```

API routes validate the session independently using `auth()` from the NextAuth configuration. A missing or invalid session returns HTTP 401.

---

## 10. Performance Model

### Constraints

The following are enforced system requirements, not targets. Any implementation that violates them must be redesigned.

| Rule | Requirement |
|---|---|
| P-01 | All financial calculations complete within 16ms |
| P-02 | No network call is permitted in the synchronous update path |
| P-03 | No spinner or loading state is shown during core recalculation |
| P-04 | The AI layer must never block UI rendering |
| P-05 | AI calls are debounced by a minimum of 800ms |
| P-06 | `calculateProjection` must have no side effects |
| P-07 | Identical inputs must not trigger a re-render of downstream components |

### Operation Classification

| Operation | Type | Maximum Time | Blocks UI |
|---|---|---|---|
| Zustand state update | Synchronous | < 1ms | No |
| `calculateProjection` | Synchronous | < 5ms | No |
| Rule engine (`evaluateRules`) | Synchronous | < 5ms | No |
| React re-render cycle | Synchronous | < 16ms | No |
| Database read on page load | Asynchronous | < 500ms | No |
| AI insight API call | Asynchronous | 800ms debounce + response | No |

---

## 11. Scalability Path

The system was designed to scale incrementally without changing the core loop.

```
Current:  [Client Engine] --> [Next.js API] --> [PostgreSQL]

Phase 2:  Add bank account connection (Plaid)
          [Plaid Webhooks] --> [Transaction Import Pipeline]

Phase 3:  Extract engine to shared package
          [Client Engine] + [Server Engine] (same pure functions)

Phase 4:  Add native mobile
          [React Native] --> [Same API Routes]
          [Client Engine] runs identically on mobile
```

Each phase is additive. The financial engine, being pure functions, requires no change regardless of the layer above it.

---

## 12. Design Token System

All visual constants are defined as CSS custom properties in `src/app/globals.css`. Components reference variables rather than hardcoded values.

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#16a34a` | Primary green — actions, accents, active states |
| `--royal-gradient` | Dark-to-light emerald | Sidebar and hero backgrounds |
| `--gold-light` | `#E8CC7A` | Result row highlight in math tooltips |
| `--primary-subtle` | `rgba(22,163,74,0.08)` | Icon container backgrounds |
| `--primary-glow` | `rgba(22,163,74,0.15)` | Hover ring and focus glow |
| `--success` | `#059669` | Positive metric indicators |
| `--warning` | `#D97706` | Caution metric indicators |
| `--danger` | `#DC2626` | Negative metric indicators |

Animations use a CSS `pageIn` keyframe. Page transitions are applied to the inner content `<div>` with `animation: pageIn 160ms ease-out backwards`. Framer Motion is not used in the main application.

---

## 13. Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Projection computed inline, not stored in state | Eliminates synchronization lag; derived values cannot be stale |
| localStorage for inputs and sliders | Zero-latency real-time loop; database writes are explicit user actions only |
| AI key server-side only | Prevents credential exposure in the browser; enforced by Next.js route handler isolation |
| Rule-based insight runs before AI | Users see an immediate recommendation regardless of API availability |
| Single Zustand store | Prevents inconsistent UI states; simplifies debugging; enables undo as a future feature |
| CSS custom properties for theming | Components are decoupled from color values; theme changes require only token updates |
| Pure financial engine functions | Deterministic, independently testable, reusable on server or mobile without modification |
