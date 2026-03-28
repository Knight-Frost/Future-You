# FutureYou — User Guide

**Version:** 1.0
**Last Updated:** 2026-03-28

This guide explains how to use FutureYou from account creation through to the full simulation and analysis workflow. It is written for end users and assumes no technical background.

---

## What FutureYou Does

FutureYou shows you the financial consequences of your decisions before you make them. Enter your current income, expenses, savings, and debt, and the system immediately calculates your financial position and projects your future.

Adjust any number — spending, debt payment, savings rate, investment — and every result on screen updates instantly. You see the direct consequence of each change without waiting, without refreshing, and without submitting a form.

---

## Getting Started

### 1. Create an Account

Navigate to `/register` and enter your name, email, and a password. The password must be at least 8 characters and contain an uppercase letter, a lowercase letter, a number, and a special character.

After registration, you are taken directly to the onboarding wizard.

### 2. Complete Onboarding

The onboarding wizard collects your financial information in four steps. You can return and update any of these values later from the Plan page.

| Step | Information Collected |
|---|---|
| Step 1 — Income and Expenses | Monthly take-home income; total monthly expenses |
| Step 2 — Savings and Investments | Current savings balance; monthly investment contribution |
| Step 3 — Debt | Total debt balance; monthly debt payment; annual interest rate |
| Step 4 — Goal | Goal name (e.g., Emergency Fund); target amount; goal type |

After completing all four steps, you are taken to the Dashboard.

---

## Pages

### Dashboard

The Dashboard is the primary view. It gives you an immediate picture of your financial health and the most important action you should take right now.

**Health status** appears in the top-right corner. The four levels are:

| Status | Meaning |
|---|---|
| Strong | Cash flow positive, savings on track, debt manageable, emergency fund present |
| Healthy | Generally positive position with minor gaps |
| Needs Attention | Positive cash flow but savings rate or emergency fund is below target |
| Critical | Monthly expenses exceed monthly income |

**Metric cards** display four key numbers. Hover over any card to see exactly how the number was calculated, including the formula and the values used.

| Card | What It Shows |
|---|---|
| Monthly Surplus | Net take-home after all expenses, debt payments, and investments |
| Debt Payoff | Projected months until the debt is cleared at the current payment rate |
| Net Worth | Total savings and investments minus total debt |
| Emergency Fund | Current savings as a multiple of monthly expenses |

**AI Insight** appears below the metric cards. It shows one specific action you should take now, with a reason and a projected outcome. The insight updates automatically when you change your financial data.

---

### Plan

The Plan page is where you update your financial inputs. Changes saved here are written to the database and will persist across sessions.

Fields available:

- Monthly income
- Monthly expenses (total, with optional category breakdown)
- Current savings balance
- Emergency fund target
- Debt balance, monthly payment, and interest rate
- Monthly investment contribution and current portfolio balance

After saving, all projections and insights across the application update to reflect the new values.

---

### Simulator

The Simulator lets you model the consequences of financial behavior changes without committing to them.

**Four sliders are available:**

| Slider | Effect |
|---|---|
| Spending reduction | Reduces monthly expenses; increases net surplus |
| Extra debt payment | Adds to the monthly debt payment; shortens payoff timeline |
| Extra savings | Increases the monthly amount directed to savings |
| Extra investment | Adds to the monthly investment contribution |

As you adjust the sliders, the before/after comparison table updates instantly. The table shows:

- Net monthly surplus (before and after)
- Months to goal (before and after)
- Months to debt freedom (before and after)
- Total interest paid (before and after)
- Interest saved

You can save any combination of slider values as a named scenario. Saved scenarios are accessible on the History page.

---

### Goals

The Goals page displays all your financial goals and tracks progress toward each one.

**Adding a goal:**

Click "Add goal" and provide:
- Goal name
- Goal type (Emergency Fund, Debt Payoff, Home Purchase, Investment, Travel, Education, Retirement, or Custom)
- Target amount
- Current amount saved toward this goal (optional)
- Target date or timeline (optional)

**Savings Rate card:**

The savings rate card shows the percentage of your income that you are retaining after expenses. Hover over the "?" icon to see the exact formula used to calculate it. The benchmark thresholds are:

| Rate | Assessment |
|---|---|
| Below 8% | Low — prioritize this |
| 8% to 15% | Below target |
| 15% to 20% | Good |
| 20% to 25% | Great |
| 25% and above | Excellent |

---

### Debt

The Debt page provides a detailed analysis of your debt position and generates three strategies for paying it off faster.

**Amortization table** shows the month-by-month breakdown of principal and interest for the next several years at your current payment rate.

**Three strategies are generated:**

| Strategy | Approach |
|---|---|
| Reduce Spending | Redirects 30% of current monthly expenses toward debt |
| Boost Payments | Calculates the exact payment needed to cut the payoff timeline by 50% |
| Combined | Splits the required increase between spending cuts and a direct payment boost |

Each strategy shows:
- The additional monthly amount required
- The projected payoff timeline
- The total interest saved versus your current payment
- A breakdown of where the extra payment can come from (surplus, investment reallocation, or spending cuts)
- Whether the strategy is feasible with your current income and expenses

---

### Insights

The Insights page shows all insights the system has generated for you, including both rule-based and AI-generated recommendations.

**Insight card structure:**

| Field | Description |
|---|---|
| Priority | CRITICAL, HIGH, MEDIUM, or LOW |
| Category | The financial area the insight addresses |
| Action | The specific thing you should do |
| Reason | Why this action is recommended now |
| Outcome | The projected result if you take this action |

You can dismiss individual insights. Dismissed insights are hidden from the main view but remain in the historical record.

**Priority levels:**

| Priority | Trigger |
|---|---|
| CRITICAL | Monthly expenses exceed income — all other goals are blocked until resolved |
| HIGH | High-interest debt above 15% APR, or emergency fund below 1 month of expenses |
| MEDIUM | Savings rate below 10%, or not investing |
| LOW | All key metrics within healthy ranges |

---

### Analytics

The Analytics page provides visual analysis of your financial position with four charts and a summary report.

**Summary stat cards** at the top of the page display Monthly Surplus, Net Worth, Savings Rate, and Financial Health. Hover over any card to see a breakdown of how the number was calculated.

**Charts:**

| Chart | What It Shows |
|---|---|
| Cash Flow | Projected monthly income, expenses, and surplus for the next 12 months |
| Spending Breakdown | Pie chart of estimated or actual (if transactions imported) expense categories |
| Debt Paydown | Projected debt balance month by month over the next 5 years |
| Net Worth Growth | Projected net worth over 10 years across three investment return scenarios |

**Export options:**

- **Download CSV** — Exports a structured spreadsheet with all financial metrics, debt analysis, and investment projections
- **Print Report** — Opens a formatted print view for physical or PDF export

---

### History

The History page shows a record of your financial position over time. Each time you update your financial profile, a snapshot is saved automatically.

Each snapshot shows:

- Monthly income, expenses, and surplus
- Savings balance and debt balance
- Savings rate and debt-to-income ratio
- Goal timeline and debt payoff projection at that point in time
- Health status at that point in time

Comparing snapshots over time allows you to measure real progress, not just projected progress.

---

### Transactions

The Transactions page allows you to import and categorize financial transactions. This data enriches the Spending Breakdown chart on the Analytics page with real figures rather than estimates.

**Importing transactions:**

1. Export a CSV from your bank's online portal
2. On the Transactions page, click "Import CSV"
3. Upload the file
4. The system normalizes merchant names, assigns categories, and deduplicates rows
5. Imported transactions appear in the list with their assigned category and confidence score

**Correcting a misclassified transaction:**

Click on a transaction and select the correct category. The correction is saved and will influence future classification of similar transactions via user-defined rules.

**Understanding confidence scores:**

| Confidence | Meaning |
|---|---|
| 80 – 100 | High confidence; category is almost certainly correct |
| 50 – 79 | Moderate confidence; verify if the category matters for your analysis |
| 0 – 49 | Low confidence; manual review recommended |

---

### Settings

The Settings page allows you to adjust application preferences and the financial parameters used in projections.

**Display settings:**

| Setting | Description |
|---|---|
| Currency | ISO currency code for display formatting |
| Locale | Number and date formatting locale |

**Projection assumptions:**

| Setting | Default | Description |
|---|---|---|
| Conservative return rate | 5% | Annual return used for conservative investment projections |
| Moderate return rate | 7% | Annual return used for moderate projections |
| Optimistic return rate | 9% | Annual return used for optimistic projections |
| Inflation rate | 3% | Reserved for future inflation-adjusted projections |

**Notification settings:**

| Setting | Description |
|---|---|
| Email notifications | Receive account and activity notifications |
| Weekly digest | Receive a weekly summary of your financial position |

---

## How Numbers Are Calculated

### Monthly Surplus

```
Monthly Surplus = Income - Expenses - Debt Payment - Investment Contribution
```

This is the true free cash available each month after all committed outflows. It is distinct from the gross remaining amount (income minus expenses only).

### Savings Rate

```
Savings Rate = (Income - Expenses) / Income
```

The savings rate uses the gross surplus — the amount retained before debt and investment. This aligns with the standard benchmarks used in personal finance (15%, 20%, 25%).

### Net Worth

```
Net Worth = Current Savings + Investment Balance - Total Debt
```

### Emergency Fund Coverage

```
Emergency Fund Coverage = Current Savings / Monthly Expenses
```

The result is expressed in months. Three months of coverage is the standard minimum; six months is recommended for added security.

### Debt Payoff Timeline

The payoff timeline is calculated by simulating the loan month by month, applying each payment to interest first and then principal. This method accounts for the changing interest amount as the balance decreases, producing an accurate result rather than a linear approximation.

### Investment Projections

```
Projected Value = (Current Balance x Growth) + (Monthly Contribution x Annuity Growth)
```

Where growth uses the compound interest formula with monthly compounding. Three return rates are used: 5% (conservative), 7% (moderate), and 9% (optimistic).

---

## Frequently Asked Questions

**Does FutureYou connect to my bank?**
No. FutureYou does not connect to bank accounts. Financial inputs are entered manually, and transactions can be imported from CSV files exported from your bank.

**Is my financial data secure?**
All data is stored in a private database associated with your account. No data is shared with third parties. The AI insight feature sends anonymized financial figures to generate a recommendation but does not transmit any personally identifying information such as your name or email address.

**Where is the AI insight coming from?**
The AI insight is generated by a language model API call made from FutureYou's server, not from your browser. Your API key is never exposed. The model receives your financial figures and a rule-based recommendation and returns a 2-3 sentence personalized response.

**What happens if I lose internet connection?**
Your most recently entered financial data is saved locally in your browser. The Dashboard, Simulator, and Goals pages will continue to display and recalculate your projections offline. Pages that require database access (History, Transactions) will not load until connectivity is restored.

**How often are projections updated?**
Projections update in real time as you type or adjust sliders. There is no refresh button and no delay. The only exceptions are the AI insight (which updates after you pause for approximately one second) and the Analytics charts (which are derived from the same live data and update alongside).

**Can I delete my account?**
Account deletion is managed through the Profile page. Deleting your account permanently removes all associated data including goals, snapshots, transactions, and insights.
