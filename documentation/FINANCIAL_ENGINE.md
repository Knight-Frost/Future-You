# FutureYou — Financial Engine Reference

**Version:** 1.0
**Last Updated:** 2026-03-28
**Location:** `src/engine/`

The financial engine is a set of pure, stateless functions. Given the same inputs, the engine always returns the same outputs. It holds no internal state, makes no network calls, and has no side effects. This design allows it to run synchronously on the client within a single animation frame.

---

## Module Overview

| Module | File | Responsibility |
|---|---|---|
| Calculator | `src/engine/calculator.ts` | Core projection engine, amortization, future value, health assessment |
| Insights | `src/engine/insights.ts` | Rule-based insight evaluation and AI prompt construction |
| Optimizer | `src/engine/optimizer.ts` | Debt payoff strategy generation with feasibility decomposition |
| Classification | `src/engine/expense/classification.ts` | Transaction category assignment |
| Normalization | `src/engine/expense/normalization.ts` | Merchant name cleaning |
| Pipeline | `src/engine/expense/pipeline.ts` | End-to-end transaction import orchestration |

---

## 1. Calculator

### 1.1 Primary Entry Point

**`calculateProjection(inputs, sliders?)`**

The main function of the engine. Takes a user's financial inputs and optional simulator slider adjustments, and returns a complete `FinancialProjection` object.

```
calculateProjection(
  inputs:  FinancialInputs,
  sliders?: SimulatorSliders
): FinancialProjection
```

**Execution sequence:**

```
1. Apply slider values to base inputs (if sliders provided)
   adjusted.income   = inputs.monthlyIncome
   adjusted.expenses = inputs.monthlyExpenses - sliders.spendingReduction
   adjusted.debt     = inputs.debtMonthlyPayment + sliders.extraDebtPayment
   adjusted.invest   = inputs.monthlyInvestment + sliders.extraInvestment

2. Compute gross monthly remaining
   monthlyRemaining = adjusted.income - adjusted.expenses

3. Compute net surplus
   netSurplus = monthlyRemaining - adjusted.debt - adjusted.invest

4. Compute savings rate
   savingsRate = monthlyRemaining / adjusted.income

5. Compute debt payoff (baseline and simulated)
   simulateLoan(balance, basePayment, rate)   --> baseline
   simulateLoan(balance, adjustedPayment, rate) --> simulated

6. Compute goal timeline (baseline and simulated)
   calcSavingsMonths(savings, baseNetSurplus, goal)   --> baseline
   calcSavingsMonths(savings, simNetSurplus, goal)     --> simulated

7. Compute emergency fund coverage
   emergencyFundMonths = currentSavings / monthlyExpenses

8. Compute debt-to-income ratio
   debtToIncomeRatio = debtMonthlyPayment / monthlyIncome

9. Compute investment projections
   For each of 10, 20, 30 years:
     futureValueLumpSum(investmentBalance, rate, years)
     + futureValueAnnuity(monthlyInvestment, rate, years)
   Across three rates: conservative (5%), moderate (7%), optimistic (9%)

10. Set transition flags
    debtBecamePayable      = baseline was Infinity, simulated is finite
    goalBecameAchievable   = baseline was Infinity, simulated is finite
    goalBecameUnachievable = baseline was finite, simulated is Infinity
    anySliderMoved         = any slider value is non-zero
```

---

### 1.2 Mathematical Formulas

#### Future Value of Annuity

Computes the accumulated value of regular monthly contributions after a given number of years, assuming monthly compounding.

```
FV = PMT * (((1 + r/12)^(n)) - 1) / (r/12)

where:
  PMT = monthly contribution
  r   = annual interest rate (decimal)
  n   = total months (years * 12)
```

**Example:** $200/month at 7% for 20 years

```
r/12  = 0.07 / 12 = 0.005833
n     = 20 * 12   = 240
FV    = 200 * (((1 + 0.005833)^240) - 1) / 0.005833
      = 200 * (3.8697 - 1) / 0.005833
      = 200 * 491.4
      = $98,280
```

Note: the previously used approximation (`200 * 12 * 20 * 2 = $96,000`) was 2.3% below the correct figure. The compound formula is always used.

---

#### Future Value of Lump Sum

Computes the future value of an existing balance with monthly compounding.

```
FV = P * (1 + r/12)^n

where:
  P = principal (current balance)
  r = annual rate (decimal)
  n = total months
```

---

#### Loan Amortization (Month-by-Month)

`simulateLoan` is the authoritative source for all interest and payoff calculations. It simulates the loan month by month rather than using the closed-form approximation, which is more accurate for irregular payment amounts.

```
for each month:
  interest_charged = balance * (annualRate / 12)
  principal_paid   = payment - interest_charged
  balance          = balance - principal_paid

  if balance <= 0:
    record final month and exit loop

return { months, totalInterest }
```

If `payment <= interest_charged` in the first month (i.e., the payment does not cover the monthly interest), the function returns `{ months: Infinity, totalInterest: Infinity }`. This signals to the UI that the debt will never be paid off at the current payment rate.

---

#### Total Interest Paid

```
totalInterest = sum of all interest_charged values across simulateLoan iterations
```

This is the amount the user pays above and beyond the original principal. It is used directly in the "interest saved" calculation when the simulator applies an extra payment.

---

#### Emergency Fund Coverage

```
emergencyFundMonths = currentSavings / monthlyExpenses
```

This represents how many months the user could sustain their current lifestyle using only their savings. The threshold used for insight evaluation is 1 month (HIGH priority) and 3 months (financial convention for an adequate emergency fund).

---

#### Savings Rate

```
savingsRate = (monthlyIncome - monthlyExpenses) / monthlyIncome
```

This is the gross savings rate — the fraction of income retained before debt payments and investment contributions. It aligns with the standard personal finance benchmarks used for guidance (10% minimum, 20% target, 25%+ excellent).

Note: the net surplus (`netSurplus = income - expenses - debtPayment - investment`) is used for goal timeline calculations, not for savings rate display. These are intentionally different metrics.

---

#### Debt-to-Income Ratio

```
debtToIncomeRatio = monthlyDebtPayment / monthlyIncome
```

A ratio above 0.36 (36%) is widely considered elevated. Above 0.43 (43%) is considered high-risk. The engine uses 0.15 as the threshold for the "debt heavy" insight category.

---

### 1.3 Financial Health Assessment

`assessFinancialHealth(projection, inputs)` evaluates four metrics and returns one of four health statuses.

```
Input Metrics:
  A = netSurplus >= 0                                  (cash flow positive)
  B = savingsRate >= 0.15                              (savings rate target)
  C = debtToIncomeRatio < 0.36                         (manageable debt load)
  D = emergencyFundMonths >= 1                         (basic safety net present)

Status Assignment:
  strong    = A and B and C and D
  healthy   = A and (B or D) and C
  attention = A and not (B and D)
  critical  = not A  (cash flow negative)
```

| Status | Label | Typical Condition |
|---|---|---|
| `strong` | Strong | Cash flow positive, savings rate >= 15%, debt-to-income < 36%, emergency fund >= 1 month |
| `healthy` | Healthy | Positive cash flow, partial metric coverage |
| `attention` | Needs Attention | Positive cash flow but savings or emergency fund inadequate |
| `critical` | Critical | Monthly expenses exceed income |

---

### 1.4 Investment Return Rate Constants

```typescript
INVESTMENT_RATES = {
  conservative: 0.05,  // 5% annual
  moderate:     0.07,  // 7% annual
  optimistic:   0.09,  // 9% annual
}
```

These are the defaults. Users may override the rates in Settings, and the adjusted values will be stored in `UserSettings` and used in future projections.

---

## 2. Insights Engine

### 2.1 Rule-Based Evaluation

`evaluateRules(inputs, projection)` runs synchronously and returns one `InsightResult`. Rules are evaluated in priority order. The first matching rule is returned.

```
evaluateRules(
  inputs:     FinancialInputs,
  projection: FinancialProjection
): InsightResult
```

**Priority hierarchy:**

```
Priority 1 — CRITICAL
  Condition: projection.netSurplus < 0
  Category:  "Cash flow deficit"
  Action:    Reduce expenses or increase income to stop the deficit
  Outcome:   Restoring positive cash flow unlocks all other financial progress

Priority 2 — HIGH (Debt)
  Condition: inputs.debtAnnualRate > 0.15 AND inputs.debtBalance > 0
  Category:  "High-interest debt"
  Action:    Increase monthly debt payment
  Outcome:   Calculated interest savings and accelerated payoff timeline

Priority 3 — HIGH (Emergency Fund)
  Condition: projection.emergencyFundMonths < 1
  Category:  "Emergency fund gap"
  Action:    Build 3 months of expenses in liquid savings
  Outcome:   Months to reach a 3-month emergency fund at current surplus

Priority 4 — MEDIUM (Savings)
  Condition: projection.savingsRate < 0.10
  Category:  "Low savings rate"
  Action:    Increase savings rate toward 15%
  Outcome:   Improvement in goal timeline

Priority 5 — MEDIUM (Investment)
  Condition: inputs.monthlyInvestment == 0
  Category:  "Not investing"
  Action:    Begin monthly investment contribution
  Outcome:   Projected value of starting $200/month at 7% over 20 years

Priority 6 — LOW
  Condition: None of the above
  Category:  "On track"
  Action:    Continue current behavior and consider increasing investment
  Outcome:   Positive reinforcement of current trajectory
```

Each `InsightResult` contains:

| Field | Type | Description |
|---|---|---|
| `priority` | InsightPriority | `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` |
| `category` | string | Short category label |
| `action` | string | Plain-language recommended action |
| `reason` | string | Explanation of why this action is recommended |
| `outcome` | string | Projected result if the action is taken |

---

### 2.2 AI Prompt Construction

`buildAIPrompt(request)` constructs a structured prompt for the server-side API call. The prompt includes:

1. The user's full financial context (income, expenses, debt, savings, goals, health status)
2. The rule-based insight already shown to the user
3. A directive to produce a 2-3 sentence personalized response that goes beyond the rule-based insight

This ensures the AI layer adds value rather than simply restating what the rule engine already said.

---

### 2.3 Insight Layer Interaction

```
User input change occurs
         |
         v
evaluateRules() called [synchronous, < 5ms]
         |
         v
InsightResult displayed immediately
         |
         v
Debounce timer resets to 800ms
         |
         (800ms passes with no further input)
         v
POST /api/ai/insights called [asynchronous]
  body = { inputs, projection, ruleInsight }
         |
         v
Claude Haiku 4.5 responds [~500-1500ms]
         |
         v
Insight panel updated with AI text
```

If the API call fails or returns after the user has changed their inputs again, the result is discarded. The rule-based insight is always the fallback.

---

## 3. Optimizer

### 3.1 Strategy Generation

`generateStrategies(inputs)` produces up to three named strategies for debt payoff acceleration.

```
generateStrategies(inputs: FinancialInputs): OptimizationResult[]
```

**Strategies generated:**

| Strategy | Label | Method |
|---|---|---|
| Strategy 1 | Reduce Spending | Targets 30% reduction in current monthly expenses as a payment boost |
| Strategy 2 | Boost Payments | Uses `findPaymentForTarget` to compute the exact payment needed to pay off in 50% of the baseline timeline |
| Strategy 3 | Combined | Splits the required extra payment: 30% from spending cuts, 70% from direct payment increase |

Returns an empty array if `inputs.debtBalance <= 0`.

---

### 3.2 Target Payment Calculation

`findPaymentForTarget(balance, annualRate, targetMonths)` uses binary search to find the exact monthly payment that achieves a given payoff timeline.

```
findPaymentForTarget(
  balance:      number,
  annualRate:   number,
  targetMonths: number
): number
```

**Algorithm:**

```
low  = balance / targetMonths    (minimum: pays no interest, linear)
high = balance                   (maximum: pay everything in one month)

repeat up to 50 iterations:
  mid = (low + high) / 2
  result = simulateLoan(balance, mid, annualRate).months

  if abs(result - targetMonths) < 0.5:
    return mid

  if result > targetMonths:
    low = mid     (payment too low, increase)
  else:
    high = mid    (payment too high, decrease)
```

This replaced an earlier implementation that used arbitrary fractions (`baseline * 1.5`) without verifying the actual resulting timeline.

---

### 3.3 Feasibility Decomposition

`decomposePaymentIncrease(requiredExtra, inputs)` breaks down the required extra monthly payment into sourced components.

```
decomposePaymentIncrease(
  requiredExtra: number,
  inputs:        FinancialInputs
): { actions: StrategyAction[], isTotallyFeasible: boolean }
```

**Source priority:**

```
1. Available surplus (netSurplus - existing obligations)
   If surplus >= requiredExtra: fully funded from surplus
   If surplus > 0: partially funded from surplus; remainder from other sources

2. Investment reallocation
   If user has monthlyInvestment > 0: suggest redirecting a portion

3. Spending cuts
   Estimate based on current expenses

4. Income gap
   If none of the above can cover the full amount: flag as income gap
```

Each `StrategyAction` contains:
- `label` — human-readable description of the action
- `amount` — dollar amount of this source
- `source` — `surplus`, `investment`, `spending`, or `income_gap`

`isTotallyFeasible` is `true` only if the full required extra payment can be funded from surplus and/or investment reallocation without requiring spending cuts beyond existing surplus.

---

## 4. Expense Classification Pipeline

### 4.1 Normalization

`normalizeDescription(rawDescription)` cleans a raw merchant description from a bank CSV export.

**Operations applied in order:**

```
1. Convert to uppercase
2. Remove common suffix codes (e.g., "POS", "ACH", "DEBIT", card numbers)
3. Collapse multiple spaces to single space
4. Trim leading and trailing whitespace
5. Remove special characters except hyphens and ampersands
```

**Example:**

```
Raw:        "WHOLEFDS #123 POS 0412"
Normalized: "WHOLE FOODS 123"
```

---

### 4.2 Classification

`classifyTransaction(normalizedName, userRules, systemRules)` assigns a category and confidence score.

**Source priority order:**

```
1. User rules (lowest rule number = checked first)
2. System rules (lowest rule number = checked first)
3. Merchant keyword database
4. Pattern inference (regular expressions)
5. Fallback: MISCELLANEOUS with confidence 0
```

Each classification returns:

| Field | Type | Description |
|---|---|---|
| `category` | ExpenseCategory | Assigned category |
| `confidence` | number | 0–100 integer |
| `explanation` | string | Reason for the assignment |
| `classifiedBy` | ClassificationSource | Which source matched |

---

### 4.3 Deduplication

Each transaction is hashed before storage to prevent duplicate imports.

```
dedupeHash = SHA-256( date.toISOString() + "|" + amount.toFixed(2) + "|" + normalizedName )
```

Before inserting, the pipeline checks for a record matching `(userId, dedupeHash)`. If a match exists, the import row is skipped and counted in the `skipped` total returned to the caller.

---

## 5. Type Reference

### FinancialInputs

```typescript
{
  monthlyIncome:        number  // Monthly take-home income
  monthlyExpenses:      number  // Total monthly expenses
  currentSavings:       number  // Liquid savings balance
  debtBalance:          number  // Total outstanding debt
  debtMonthlyPayment:   number  // Current monthly payment
  debtAnnualRate:       number  // APR as decimal (e.g. 0.18)
  goalName:             string  // Goal label
  goalAmount:           number  // Goal target amount
  monthlyInvestment:    number  // Monthly investment contribution
  investmentBalance:    number  // Current portfolio balance
}
```

### SimulatorSliders

```typescript
{
  spendingReduction:  number  // Monthly spending cut
  extraDebtPayment:   number  // Additional monthly debt payment
  extraSavings:       number  // Additional monthly savings
  extraInvestment:    number  // Additional monthly investment
}
```

### FinancialProjection

```typescript
{
  monthlyRemaining:        number   // Income minus expenses (gross)
  netSurplus:              number   // Gross minus debt payment minus investment
  savingsRate:             number   // monthlyRemaining / monthlyIncome
  debtToIncomeRatio:       number   // debtPayment / monthlyIncome
  emergencyFundMonths:     number   // currentSavings / monthlyExpenses

  goalTimelineMonths:      number   // Months to goal (baseline)
  simulatedGoalMonths:     number   // Months to goal (with sliders)
  goalTimeDelta:           number   // Negative = faster

  debtPayoffMonths:        number   // Months to pay off debt (baseline)
  simulatedDebtMonths:     number   // Months to pay off debt (with sliders)
  debtTimeDelta:           number   // Negative = sooner
  totalInterest:           number   // Total interest at baseline payment
  interestSaved:           number   // Interest avoided with extra payment

  investments: {
    tenYear:    { conservative, moderate, optimistic }
    twentyYear: { conservative, moderate, optimistic }
    thirtyYear: { conservative, moderate, optimistic }
  }

  debtBecamePayable:       boolean  // Slider crossed the breakeven threshold
  goalBecameAchievable:    boolean  // Slider made a previously impossible goal reachable
  goalBecameUnachievable:  boolean  // Slider made a previously achievable goal unreachable
  anySliderMoved:          boolean  // At least one slider is non-zero
}
```

---

## 6. Default Input Values

The following defaults are loaded when no persisted user data exists.

| Input | Default | Rationale |
|---|---|---|
| `monthlyIncome` | 4000 | Median individual income approximation |
| `monthlyExpenses` | 3200 | Leaves a 20% gross surplus for demonstration |
| `currentSavings` | 800 | Below 1 month of expenses to trigger an insight |
| `debtBalance` | 6000 | Demonstrates debt payoff calculation |
| `debtMonthlyPayment` | 150 | Below the interest breakeven at 18% APR for demonstration |
| `debtAnnualRate` | 0.18 | Typical credit card APR |
| `goalName` | Emergency Fund | Most common first financial goal |
| `goalAmount` | 3000 | Approximately 1 month of expenses at default settings |
| `monthlyInvestment` | 0 | Triggers the "not investing" insight |
| `investmentBalance` | 0 | |

These defaults are designed to immediately surface several insights on first use without requiring the user to enter any data.
