# FutureYou — API Reference

**Version:** 1.0
**Last Updated:** 2026-03-28
**Base URL:** `/api`

All API routes are Next.js Route Handlers located in `src/app/api/`. All protected routes require an active NextAuth session. Unauthenticated requests receive HTTP 401.

---

## Authentication

### POST /api/auth/register

Creates a new user account.

**Authentication required:** No

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | No | Display name |
| `email` | string | Yes | Must be a valid email address |
| `password` | string | Yes | Minimum 8 characters |

**Success response — HTTP 201:**

```json
{
  "data": {
    "id": "clxyz123",
    "email": "user@example.com",
    "name": "Jane Smith"
  }
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 400 | Missing required fields or invalid email format |
| 409 | An account with that email already exists |
| 500 | Internal server error |

---

### POST /api/auth/[...nextauth]

Handled by NextAuth v5. Supports:

- `POST /api/auth/signin` — Sign in with credentials
- `POST /api/auth/signout` — Sign out and clear session
- `GET /api/auth/session` — Return current session data

Credentials sign-in expects `{ email, password }` in the request body. On success, a signed JWT session cookie is set.

---

## Financial Profile

### GET /api/profile

Returns the authenticated user's financial profile.

**Authentication required:** Yes

**Success response — HTTP 200:**

```json
{
  "data": {
    "monthlyIncome": 4000,
    "monthlyExpenses": 3200,
    "currentSavings": 800,
    "debtBalance": 6000,
    "debtMonthlyPayment": 150,
    "debtAnnualRate": 0.18,
    "monthlyInvestment": 0,
    "investmentBalance": 0,
    "goalName": "Emergency Fund",
    "goalAmount": 3000
  }
}
```

Returns `null` for `data` if no profile exists yet (user has not completed onboarding).

---

### PATCH /api/profile

Updates the authenticated user's financial profile.

**Authentication required:** Yes

**Request body:** Any subset of the profile fields. Only provided fields are updated.

| Field | Type | Description |
|---|---|---|
| `monthlyIncome` | number | Monthly gross take-home income |
| `monthlyExpenses` | number | Total monthly living expenses |
| `currentSavings` | number | Current savings account balance |
| `debtBalance` | number | Total outstanding debt |
| `debtMonthlyPayment` | number | Current monthly debt payment |
| `debtAnnualRate` | number | Debt annual interest rate (decimal, e.g. 0.18 for 18%) |
| `monthlyInvestment` | number | Monthly investment contribution |
| `investmentBalance` | number | Current investment portfolio balance |

**Success response — HTTP 200:**

```json
{
  "data": { "updated": true }
}
```

---

## Goals

### GET /api/goals

Returns all goals for the authenticated user.

**Authentication required:** Yes

**Success response — HTTP 200:**

```json
{
  "data": [
    {
      "id": "clxyz456",
      "title": "Emergency Fund",
      "type": "EMERGENCY_FUND",
      "targetAmount": 3000,
      "currentAmount": 800,
      "targetDate": null,
      "targetMonths": null,
      "priority": 1,
      "status": "ACTIVE",
      "notes": null,
      "createdAt": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/goals

Creates a new goal.

**Authentication required:** Yes

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Goal name |
| `type` | GoalType | Yes | One of the goal type values listed below |
| `targetAmount` | number | Yes | Target savings amount |
| `currentAmount` | number | No | Current amount saved toward this goal (default: 0) |
| `targetDate` | ISO date string | No | Optional deadline |
| `targetMonths` | number | No | Optional timeline in months |
| `priority` | number | No | Sort order; 1 is highest (default: 1) |
| `notes` | string | No | Free-text notes |

**Goal type values:**

`EMERGENCY_FUND` · `DEBT_PAYOFF` · `HOME_PURCHASE` · `INVESTMENT` · `TRAVEL` · `EDUCATION` · `RETIREMENT` · `CUSTOM`

**Success response — HTTP 201:**

```json
{
  "data": { "id": "clxyz789", "title": "Emergency Fund", "..." }
}
```

---

### PATCH /api/goals/[id]

Updates an existing goal.

**Authentication required:** Yes

**URL parameter:** `id` — Goal record ID

**Request body:** Any subset of goal fields (same as POST). Only provided fields are updated.

**Success response — HTTP 200:**

```json
{
  "data": { "updated": true }
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 403 | Goal belongs to a different user |
| 404 | Goal ID not found |

---

### DELETE /api/goals/[id]

Deletes a goal permanently.

**Authentication required:** Yes

**URL parameter:** `id` — Goal record ID

**Success response — HTTP 200:**

```json
{
  "data": { "deleted": true }
}
```

---

## Scenarios

### GET /api/scenarios

Returns all saved simulator scenarios for the authenticated user.

**Authentication required:** Yes

**Success response — HTTP 200:**

```json
{
  "data": [
    {
      "id": "clscenario1",
      "name": "Aggressive Debt Payoff",
      "description": "Cut dining by $200, add $200 to debt payment",
      "spendingReduction": 200,
      "extraDebtPayment": 200,
      "extraSavings": 0,
      "extraInvestment": 0,
      "resultGoalMonths": 8,
      "resultDebtMonths": 22,
      "resultInterestSaved": 620,
      "isPreferred": true,
      "createdAt": "2026-03-15T14:30:00.000Z"
    }
  ]
}
```

---

### POST /api/scenarios

Saves a simulator scenario.

**Authentication required:** Yes

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Scenario label |
| `description` | string | No | Free-text description |
| `spendingReduction` | number | Yes | Monthly spending reduction amount |
| `extraDebtPayment` | number | Yes | Monthly extra debt payment |
| `extraSavings` | number | Yes | Monthly extra savings amount |
| `extraInvestment` | number | Yes | Monthly extra investment amount |
| `resultGoalMonths` | number | No | Projected months to goal with this scenario |
| `resultDebtMonths` | number | No | Projected months to debt freedom |
| `resultInterestSaved` | number | No | Projected interest saved |
| `isPreferred` | boolean | No | Marks this as the user's preferred scenario |

**Success response — HTTP 201:**

```json
{
  "data": { "id": "clscenario2", "name": "..." }
}
```

---

## Strategies

### GET /api/strategies

Returns saved debt payoff strategies for the authenticated user.

**Authentication required:** Yes

**Success response — HTTP 200:**

```json
{
  "data": [
    {
      "id": "clstrategy1",
      "label": "Reduce Spending",
      "title": "Reduce spending by 30%",
      "type": "REDUCE_SPENDING",
      "requiredMonthlyExtra": 180,
      "projectedMonths": 28,
      "projectedInterestSaved": 540,
      "feasibility": "FEASIBLE",
      "isRecommended": true
    }
  ]
}
```

---

### POST /api/strategies

Persists a set of generated strategies to the database.

**Authentication required:** Yes

**Request body:** Array of strategy objects matching the `OptimizationResult` type.

**Success response — HTTP 201:**

```json
{
  "data": { "saved": 3 }
}
```

---

## Transactions

### GET /api/transactions

Returns transactions for the authenticated user with optional filtering.

**Authentication required:** Yes

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `category` | string | Filter by expense category |
| `from` | ISO date | Start date (inclusive) |
| `to` | ISO date | End date (inclusive) |
| `limit` | number | Maximum records to return (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

**Success response — HTTP 200:**

```json
{
  "data": {
    "transactions": [
      {
        "id": "cltx1",
        "date": "2026-03-15T00:00:00.000Z",
        "rawDescription": "WHOLE FOODS MKT #123",
        "normalizedName": "Whole Foods Market",
        "amount": 87.42,
        "isDebit": true,
        "category": "FOOD",
        "confidence": 92,
        "userCategory": null
      }
    ],
    "total": 124,
    "hasMore": true
  }
}
```

---

### POST /api/transactions/import

Imports transactions from a parsed CSV payload.

**Authentication required:** Yes

**Request body:**

| Field | Type | Description |
|---|---|---|
| `rows` | array | Array of `{ date, description, amount }` objects |
| `source` | string | Import source label (e.g., `"csv"`) |

Each row is normalized, classified, and deduplicated before storage. Duplicate rows (matching SHA-256 hash of date + amount + normalizedName) are skipped silently.

**Success response — HTTP 200:**

```json
{
  "data": {
    "imported": 38,
    "skipped": 4,
    "total": 42
  }
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 400 | `rows` is missing, empty, or contains invalid entries |

---

### GET /api/transactions/analytics

Returns aggregated spending analytics for a given time window.

**Authentication required:** Yes

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `months` | number | 3 | Number of past months to include |

**Success response — HTTP 200:**

```json
{
  "hasData": true,
  "data": {
    "categoryBreakdown": [
      {
        "category": "FOOD",
        "label": "Food",
        "totalAmount": 876.30,
        "transactionCount": 31,
        "percentage": 27.4,
        "color": "#16a34a",
        "description": "Groceries and dining"
      }
    ],
    "monthlyTrend": [
      { "month": "Jan 2026", "totalExpenses": 3180 },
      { "month": "Feb 2026", "totalExpenses": 3240 }
    ],
    "monthlyAverage": 3210,
    "totalTransactions": 89,
    "lowConfidenceCount": 6,
    "monthsAnalyzed": 3
  }
}
```

Returns `{ "hasData": false }` when no transactions exist for the window.

---

### PATCH /api/transactions/[id]

Updates a transaction, typically to correct a misclassified category.

**Authentication required:** Yes

**URL parameter:** `id` — Transaction record ID

**Request body:**

| Field | Type | Description |
|---|---|---|
| `userCategory` | ExpenseCategory | Corrected category |

**Success response — HTTP 200:**

```json
{
  "data": { "updated": true }
}
```

---

### DELETE /api/transactions/[id]

Deletes a transaction.

**Authentication required:** Yes

**Success response — HTTP 200:**

```json
{
  "data": { "deleted": true }
}
```

---

## Expense Rules

### GET /api/expense-rules

Returns all classification rules visible to the authenticated user (user-defined rules and system rules).

**Authentication required:** Yes

**Success response — HTTP 200:**

```json
{
  "data": [
    {
      "id": "clrule1",
      "pattern": "WHOLE FOODS",
      "patternType": "CONTAINS",
      "category": "FOOD",
      "priority": 10,
      "isUserDefined": true,
      "hitCount": 14
    }
  ]
}
```

---

### POST /api/expense-rules

Creates a user-defined classification rule.

**Authentication required:** Yes

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `pattern` | string | Yes | Text pattern to match against normalized merchant name |
| `patternType` | string | Yes | One of: `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `EXACT`, `REGEX` |
| `category` | ExpenseCategory | Yes | Category to assign when pattern matches |
| `priority` | number | No | Lower number = higher priority (default: 100) |
| `description` | string | No | Human-readable label for this rule |

**Success response — HTTP 201:**

```json
{
  "data": { "id": "clrule2" }
}
```

---

### DELETE /api/expense-rules/[id]

Deletes a user-defined classification rule.

**Authentication required:** Yes

**URL parameter:** `id` — Rule record ID

**Success response — HTTP 200:**

```json
{
  "data": { "deleted": true }
}
```

---

## AI Insights

### POST /api/ai/insights

Generates a personalized financial insight using the Anthropic API. This route is called by the client after an 800ms debounce following user interaction.

**Authentication required:** Yes

**Request body:**

| Field | Type | Description |
|---|---|---|
| `inputs` | FinancialInputs | Current financial inputs from the Zustand store |
| `projection` | FinancialProjection | Computed projection from the financial engine |
| `ruleInsight` | InsightResult | The synchronous rule-based insight already shown to the user |

**Success response — HTTP 200:**

```json
{
  "data": {
    "insight": "Your 18% debt rate is the highest-cost item in your budget. Adding $100 per month to your payment clears the debt 13 months sooner and saves $450 in interest — a guaranteed 18% return on that money."
  }
}
```

If the Anthropic API is unavailable, the route returns HTTP 200 with `insight: null` rather than an error, allowing the client to keep the rule-based insight visible.

**Model used:** `claude-haiku-4-5`
**Max tokens:** 200

---

## Settings

### GET /api/settings

Returns the authenticated user's application settings.

**Authentication required:** Yes

**Success response — HTTP 200:**

```json
{
  "data": {
    "currency": "USD",
    "locale": "en-US",
    "darkMode": false,
    "emailNotifications": true,
    "weeklyDigest": true,
    "conservativeReturnRate": 0.05,
    "moderateReturnRate": 0.07,
    "optimisticReturnRate": 0.09,
    "inflationRate": 0.03,
    "showInvestmentProjections": true,
    "defaultView": "dashboard"
  }
}
```

---

### PATCH /api/settings

Updates one or more settings for the authenticated user.

**Authentication required:** Yes

**Request body:** Any subset of settings fields.

**Success response — HTTP 200:**

```json
{
  "data": { "updated": true }
}
```

---

## Onboarding

### POST /api/onboarding

Persists data from a completed onboarding step and advances the user's `onboardingStep` counter.

**Authentication required:** Yes

**Request body:**

| Field | Type | Description |
|---|---|---|
| `step` | number | The step number being completed (1–4) |
| `data` | OnboardingData | Financial data collected on this step |

**OnboardingData fields (all optional per step):**

| Field | Steps |
|---|---|
| `monthlyIncome` | Step 1 |
| `monthlyExpenses` | Step 1 |
| `currentSavings` | Step 2 |
| `debtBalance` | Step 3 |
| `debtMonthlyPayment` | Step 3 |
| `debtAnnualRate` | Step 3 |
| `goalName` | Step 4 |
| `goalAmount` | Step 4 |
| `goalType` | Step 4 |
| `monthlyInvestment` | Step 2 |

When step 4 is submitted with `onboardingDone: true`, the `User.onboardingDone` flag is set and the user is redirected to the dashboard.

**Success response — HTTP 200:**

```json
{
  "data": { "step": 2, "onboardingDone": false }
}
```

---

## Error Format

All error responses follow this structure:

```json
{
  "error": "Human-readable error message"
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — no valid session |
| 403 | Forbidden — resource belongs to another user |
| 404 | Not found — resource ID does not exist |
| 409 | Conflict — duplicate resource (e.g., duplicate email) |
| 500 | Internal server error |

---

## Expense Category Values

The following values are valid for all `category` and `userCategory` fields.

| Value | Label |
|---|---|
| `HOUSING` | Housing |
| `FOOD` | Food |
| `TRANSPORTATION` | Transportation |
| `UTILITIES` | Utilities |
| `SUBSCRIPTIONS` | Subscriptions |
| `HEALTHCARE` | Healthcare |
| `DEBT_PAYMENTS` | Debt Payments |
| `SAVINGS_INVESTMENTS` | Savings and Investments |
| `MISCELLANEOUS` | Miscellaneous |
