# FutureYou — Data Model Reference

**Version:** 1.0
**Last Updated:** 2026-03-28
**ORM:** Prisma 5
**Database:** PostgreSQL 15+

---

## Entity Relationship Overview

```
User
 |
 +-- FinancialProfile (1:1)
 |
 +-- Goal[] (1:many)
 |
 +-- Scenario[] (1:many)
 |
 +-- Strategy[] (1:many)
 |
 +-- Insight[] (1:many)
 |
 +-- Snapshot[] (1:many)
 |
 +-- Transaction[] (1:many)
 |
 +-- ExpenseRule[] (1:many)
 |
 +-- UserSettings (1:1)
 |
 +-- Account[] (1:many, NextAuth)
 |
 +-- Session[] (1:many, NextAuth)
```

All application data is scoped to a `User` record. There are no shared or cross-user data structures outside of system-level `ExpenseRule` records (where `userId` is null).

---

## Tables

### User

Central identity record. Created on registration. All other tables reference this record by `userId`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | Auto-generated unique identifier |
| `email` | String | Unique, Not Null | Login credential; must be unique across all users |
| `emailVerified` | DateTime | Nullable | Set when email verification is completed |
| `name` | String | Nullable | Display name |
| `image` | String | Nullable | Profile image URL |
| `passwordHash` | String | Nullable | bcrypt hash of user password; null for OAuth users |
| `timezone` | String | Default: `"UTC"` | IANA timezone string |
| `onboardingDone` | Boolean | Default: `false` | Set to true when 4-step onboarding is completed |
| `onboardingStep` | Integer | Default: `0` | Tracks which onboarding step has been reached |
| `createdAt` | DateTime | Default: now() | Record creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

---

### FinancialProfile

Stores the user's persisted financial inputs. Updated explicitly when the user saves from the Plan page. This is separate from the Zustand store, which holds the live working state.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | |
| `userId` | String | Unique FK → User | One profile per user |
| `monthlyIncome` | Float | Default: `0` | Monthly take-home income |
| `monthlyExpenses` | Float | Default: `0` | Total monthly living expenses |
| `housingExpense` | Float | Nullable | Housing component of expenses |
| `transportExpense` | Float | Nullable | Transport component |
| `foodExpense` | Float | Nullable | Food component |
| `utilitiesExpense` | Float | Nullable | Utilities component |
| `entertainmentExpense` | Float | Nullable | Entertainment component |
| `otherExpense` | Float | Nullable | Remaining/uncategorized component |
| `currentSavings` | Float | Default: `0` | Liquid savings balance |
| `emergencyFundTarget` | Float | Nullable | User-defined emergency fund target amount |
| `monthlyInvestment` | Float | Default: `0` | Monthly investment contribution |
| `investmentBalance` | Float | Default: `0` | Current investment portfolio value |
| `debtBalance` | Float | Default: `0` | Total outstanding debt |
| `debtMonthlyPayment` | Float | Default: `0` | Current monthly debt payment |
| `debtAnnualRate` | Float | Default: `0.18` | Debt APR as a decimal (18% = 0.18) |
| `debtType` | String | Nullable | One of: `credit_card`, `personal_loan`, `student_loan`, `other` |
| `debtName` | String | Nullable | Human-readable debt label |
| `investmentReturnRate` | Float | Default: `0.07` | Assumed annual return rate for projections |
| `createdAt` | DateTime | Default: now() | |
| `updatedAt` | DateTime | Auto-updated | |

---

### Goal

Represents a named financial target. A user may have multiple goals with different types and priorities.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | |
| `userId` | String | FK → User | |
| `title` | String | Not Null | Goal name |
| `type` | GoalType | Enum | See GoalType values below |
| `targetAmount` | Float | Not Null | Amount to reach |
| `currentAmount` | Float | Default: `0` | Amount saved toward this goal |
| `targetDate` | DateTime | Nullable | Optional deadline |
| `targetMonths` | Integer | Nullable | Optional timeline in months |
| `priority` | Integer | Default: `1` | Sort order; lower number = higher priority |
| `status` | GoalStatus | Default: `ACTIVE` | See GoalStatus values below |
| `notes` | String | Nullable | Free-text notes |
| `createdAt` | DateTime | Default: now() | |
| `updatedAt` | DateTime | Auto-updated | |

**GoalType values:**

| Value | Description |
|---|---|
| `EMERGENCY_FUND` | Liquid savings buffer (typically 3-6 months of expenses) |
| `DEBT_PAYOFF` | Eliminate a specific debt |
| `HOME_PURCHASE` | Down payment or purchase fund |
| `INVESTMENT` | General investment target |
| `TRAVEL` | Travel savings |
| `EDUCATION` | Education or training fund |
| `RETIREMENT` | Retirement savings target |
| `CUSTOM` | User-defined goal type |

**GoalStatus values:**

| Value | Meaning |
|---|---|
| `ACTIVE` | In progress |
| `PAUSED` | Temporarily suspended |
| `COMPLETED` | Target amount reached |
| `ABANDONED` | Discontinued |

---

### Scenario

A saved simulator configuration with its projected outcomes. Allows users to compare different financial behavior changes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | |
| `userId` | String | FK → User | |
| `name` | String | Not Null | Scenario label |
| `description` | String | Nullable | Free-text description |
| `spendingReduction` | Float | Default: `0` | Monthly spending reduction amount |
| `extraDebtPayment` | Float | Default: `0` | Monthly extra debt payment |
| `extraSavings` | Float | Default: `0` | Monthly extra savings contribution |
| `extraInvestment` | Float | Default: `0` | Monthly extra investment contribution |
| `resultGoalMonths` | Float | Nullable | Projected months to goal with this scenario applied |
| `resultDebtMonths` | Float | Nullable | Projected months to debt freedom |
| `resultInterestSaved` | Float | Nullable | Projected interest saved versus baseline |
| `resultMonthlyGain` | Float | Nullable | Change in monthly net surplus |
| `projectionData` | JSON | Nullable | Chart data points for visualization |
| `isActive` | Boolean | Default: `false` | Whether this scenario is currently loaded in the simulator |
| `isPreferred` | Boolean | Default: `false` | User's marked preferred scenario |
| `createdAt` | DateTime | Default: now() | |
| `updatedAt` | DateTime | Auto-updated | |

---

### Strategy

A generated debt payoff strategy with feasibility metadata. Strategies are generated by `optimizer.ts` and can be persisted for later reference.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | |
| `userId` | String | FK → User | |
| `label` | String | Not Null | Short label (e.g., "Reduce Spending") |
| `title` | String | Not Null | Full title (e.g., "Reduce spending by 30%") |
| `description` | String | Not Null | Plain-language strategy description |
| `type` | StrategyType | Enum | See StrategyType values below |
| `requiredMonthlyExtra` | Float | Not Null | Additional monthly amount needed |
| `spendingChange` | Float | Default: `0` | Spending reduction component |
| `paymentChange` | Float | Default: `0` | Extra debt payment component |
| `savingsChange` | Float | Default: `0` | Savings adjustment component |
| `projectedMonths` | Float | Nullable | Projected debt-free month with this strategy |
| `projectedInterestSaved` | Float | Nullable | Interest saved versus baseline |
| `projectedTimeReduction` | Float | Nullable | Months saved versus baseline |
| `feasibility` | Feasibility | Default: `FEASIBLE` | See Feasibility values below |
| `isRecommended` | Boolean | Default: `false` | Whether this is the recommended strategy |
| `isActive` | Boolean | Default: `false` | Whether the user has activated this strategy |
| `notes` | String | Nullable | Free-text notes |
| `generatedAt` | DateTime | Default: now() | When this strategy was computed |
| `activatedAt` | DateTime | Nullable | When the user activated this strategy |
| `updatedAt` | DateTime | Auto-updated | |

**StrategyType values:**

| Value | Description |
|---|---|
| `REDUCE_SPENDING` | Reduce monthly expenses to free up cash for debt |
| `BOOST_PAYMENT` | Increase debt payment directly |
| `COMBINED` | Split approach across spending cuts and payment increase |
| `INCOME_GROWTH` | Supplement income to cover the required extra payment |
| `REFINANCE` | Refinance at a lower rate |

**Feasibility values:**

| Value | Meaning |
|---|---|
| `FEASIBLE` | Can be funded from available surplus |
| `AGGRESSIVE` | Requires spending cuts beyond current surplus |
| `INFEASIBLE` | Cannot be funded without income increase |

---

### Insight

A historical record of insights shown to the user. Includes both synchronous rule-based insights and asynchronous AI-generated insights.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | |
| `userId` | String | FK → User | |
| `source` | InsightSource | Enum | `RULE_BASED` or `AI_GENERATED` |
| `priority` | InsightPriority | Enum | `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` |
| `category` | String | Not Null | Insight category label (e.g., "High-interest debt") |
| `action` | String | Not Null | Plain-language recommended action |
| `reason` | String | Not Null | Why this action is recommended |
| `outcome` | String | Not Null | Projected result if action is taken |
| `pageContext` | String | Nullable | Which page generated this insight |
| `isRead` | Boolean | Default: `false` | Whether the user has viewed this insight |
| `isDismissed` | Boolean | Default: `false` | Whether the user has dismissed this insight |
| `createdAt` | DateTime | Default: now() | |

---

### Snapshot

A point-in-time record of the user's financial state. Created automatically at regular intervals or when the user saves their profile. Used by the History page to show trends over time.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | |
| `userId` | String | FK → User | |
| `monthlyIncome` | Float | Not Null | |
| `monthlyExpenses` | Float | Not Null | |
| `monthlySurplus` | Float | Not Null | Gross monthly surplus at snapshot time |
| `currentSavings` | Float | Not Null | |
| `debtBalance` | Float | Not Null | |
| `debtPayment` | Float | Not Null | |
| `monthlyInvestment` | Float | Not Null | |
| `savingsRate` | Float | Not Null | Calculated savings rate at snapshot time |
| `debtToIncome` | Float | Not Null | Debt-to-income ratio at snapshot time |
| `goalTimelineMonths` | Float | Nullable | Projected goal timeline at snapshot time |
| `debtPayoffMonths` | Float | Nullable | Projected debt payoff at snapshot time |
| `totalInterestCost` | Float | Nullable | Total interest projected at snapshot time |
| `gapMonths` | Float | Nullable | Months ahead (negative) or behind (positive) a target |
| `healthStatus` | String | Not Null | `strong`, `healthy`, `attention`, or `critical` |
| `createdAt` | DateTime | Default: now() | Snapshot timestamp |

---

### Transaction

An individual financial transaction imported from CSV or entered manually. The classification pipeline assigns a category and confidence score to each record.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | |
| `userId` | String | FK → User | |
| `date` | DateTime | Not Null | Transaction date |
| `rawDescription` | String | Not Null | Merchant description preserved verbatim from source |
| `amount` | Float | Not Null | Always a positive number (absolute value) |
| `isDebit` | Boolean | Default: `true` | True = expense, False = income/credit |
| `normalizedName` | String | Not Null | Cleaned merchant name after normalization |
| `category` | ExpenseCategory | Enum | System-assigned category |
| `subcategory` | String | Nullable | Optional finer-grained label |
| `confidence` | Integer | Not Null | Classification confidence 0–100 |
| `explanation` | String | Not Null | Human-readable reason for the assigned category |
| `classifiedBy` | ClassificationSource | Enum | See ClassificationSource values below |
| `userCategory` | ExpenseCategory | Nullable | Category set by the user to correct a misclassification |
| `userCorrectedAt` | DateTime | Nullable | Timestamp of user correction |
| `importSource` | String | Nullable | `csv`, `manual`, or `api` |
| `importBatchId` | String | Nullable | Groups transactions from the same import |
| `dedupeHash` | String | Not Null | SHA-256 of `(date + amount + normalizedName)` |
| `isDuplicate` | Boolean | Default: `false` | Set when a matching hash already exists |
| `createdAt` | DateTime | Default: now() | |
| `updatedAt` | DateTime | Auto-updated | |

**Unique constraint:** `(userId, dedupeHash)` — prevents duplicate imports.

**Indexes:** `(userId, date)`, `(userId, category)`

**ClassificationSource values:**

| Value | Meaning |
|---|---|
| `USER_RULE` | Matched a user-defined expense rule |
| `SYSTEM_RULE` | Matched a built-in system rule |
| `MERCHANT_DB` | Matched a known merchant lookup |
| `KEYWORD_MATCH` | Matched on a keyword pattern |
| `PATTERN_INFERENCE` | Inferred from description patterns |
| `FALLBACK` | Could not be classified; assigned MISCELLANEOUS |

---

### ExpenseRule

A pattern-based classification rule. User-defined rules take priority over system rules.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | |
| `userId` | String | Nullable FK → User | Null = system-wide rule |
| `pattern` | String | Not Null | Text to match against normalized merchant name |
| `patternType` | RulePatternType | Enum | See RulePatternType values below |
| `category` | ExpenseCategory | Enum | Category to assign when pattern matches |
| `priority` | Integer | Default: `100` | Lower number = checked first |
| `isUserDefined` | Boolean | Default: `false` | True for rules created by the user |
| `description` | String | Nullable | Human-readable label for this rule |
| `hitCount` | Integer | Default: `0` | Number of transactions matched |
| `lastHitAt` | DateTime | Nullable | Timestamp of most recent match |
| `createdAt` | DateTime | Default: now() | |

**Index:** `(userId)`

**RulePatternType values:**

| Value | Behavior |
|---|---|
| `CONTAINS` | Pattern appears anywhere in the normalized name |
| `STARTS_WITH` | Normalized name begins with the pattern |
| `ENDS_WITH` | Normalized name ends with the pattern |
| `EXACT` | Normalized name matches the pattern exactly |
| `REGEX` | Pattern is evaluated as a regular expression |

---

### UserSettings

Per-user application preferences including display settings and assumed financial parameters.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, CUID | |
| `userId` | String | Unique FK → User | |
| `currency` | String | Default: `"USD"` | ISO 4217 currency code |
| `locale` | String | Default: `"en-US"` | BCP 47 locale tag |
| `darkMode` | Boolean | Default: `false` | |
| `emailNotifications` | Boolean | Default: `true` | |
| `weeklyDigest` | Boolean | Default: `true` | |
| `conservativeReturnRate` | Float | Default: `0.05` | Annual return rate for conservative projection |
| `moderateReturnRate` | Float | Default: `0.07` | Annual return rate for moderate projection |
| `optimisticReturnRate` | Float | Default: `0.09` | Annual return rate for optimistic projection |
| `inflationRate` | Float | Default: `0.03` | Assumed inflation rate (reserved for future use) |
| `showInvestmentProjections` | Boolean | Default: `true` | Show/hide the investment projection section |
| `defaultView` | String | Default: `"dashboard"` | Landing page after login |
| `createdAt` | DateTime | Default: now() | |
| `updatedAt` | DateTime | Auto-updated | |

---

### Account and Session (NextAuth)

These tables are managed entirely by NextAuth v5. Do not write to them directly.

**Account** — Links a User to an OAuth provider account.

| Column | Description |
|---|---|
| `userId` | FK → User |
| `type` | Provider type (e.g., `oauth`, `credentials`) |
| `provider` | Provider ID (e.g., `google`) |
| `providerAccountId` | Account ID from the provider |

**Session** — Active JWT session records.

| Column | Description |
|---|---|
| `userId` | FK → User |
| `sessionToken` | Unique session token |
| `expires` | Session expiry timestamp |

---

## Enumerations Summary

| Enum | Values |
|---|---|
| `GoalType` | `EMERGENCY_FUND`, `DEBT_PAYOFF`, `HOME_PURCHASE`, `INVESTMENT`, `TRAVEL`, `EDUCATION`, `RETIREMENT`, `CUSTOM` |
| `GoalStatus` | `ACTIVE`, `PAUSED`, `COMPLETED`, `ABANDONED` |
| `StrategyType` | `REDUCE_SPENDING`, `BOOST_PAYMENT`, `COMBINED`, `INCOME_GROWTH`, `REFINANCE` |
| `Feasibility` | `FEASIBLE`, `AGGRESSIVE`, `INFEASIBLE` |
| `InsightSource` | `RULE_BASED`, `AI_GENERATED` |
| `InsightPriority` | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `ExpenseCategory` | `HOUSING`, `FOOD`, `TRANSPORTATION`, `UTILITIES`, `SUBSCRIPTIONS`, `HEALTHCARE`, `DEBT_PAYMENTS`, `SAVINGS_INVESTMENTS`, `MISCELLANEOUS` |
| `ClassificationSource` | `USER_RULE`, `SYSTEM_RULE`, `MERCHANT_DB`, `KEYWORD_MATCH`, `PATTERN_INFERENCE`, `FALLBACK` |
| `RulePatternType` | `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `EXACT`, `REGEX` |
| `HealthStatus` | `strong`, `healthy`, `attention`, `critical` |

---

## Data Isolation and Ownership

Every query against application tables must be scoped to the authenticated user's `userId`. The Prisma client does not enforce row-level security at the database level; enforcement is the responsibility of the API route handler.

All route handlers follow this pattern before returning or modifying any record:

```
1. Read session userId from NextAuth
2. Fetch the record by its primary key
3. Verify record.userId === session.userId
4. Proceed if match; return HTTP 403 if not
```
