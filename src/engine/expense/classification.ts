/**
 * Classification Engine
 *
 * 6-layer decision pipeline (deterministic first, adaptive second):
 *
 *   Layer 1: User-defined rules  (confidence 99%  — always trust the user)
 *   Layer 2: System rules        (confidence 85–95%)
 *   Layer 3: Merchant registry   (confidence 90%+)
 *   Layer 4: Keyword matching    (confidence 70–85%)
 *   Layer 5: Pattern inference   (confidence 50–65%)
 *   Layer 6: Fallback            (confidence 25% — needs user review)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'HOUSING'
  | 'FOOD'
  | 'TRANSPORTATION'
  | 'UTILITIES'
  | 'SUBSCRIPTIONS'
  | 'HEALTHCARE'
  | 'DEBT_PAYMENTS'
  | 'SAVINGS_INVESTMENTS'
  | 'MISCELLANEOUS';

export type ClassificationSource =
  | 'USER_RULE'
  | 'SYSTEM_RULE'
  | 'MERCHANT_DB'
  | 'KEYWORD_MATCH'
  | 'PATTERN_INFERENCE'
  | 'FALLBACK';

export interface ClassificationResult {
  category: ExpenseCategory;
  subcategory?: string;
  confidence: number;           // 0–100
  explanation: string;          // Human-readable: exactly WHY this category
  classifiedBy: ClassificationSource;
}

export interface UserRule {
  pattern: string;
  patternType: 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'EXACT' | 'REGEX';
  category: ExpenseCategory;
  priority: number;
}

// ─── Category display names + descriptions ────────────────────────────────────

export const CATEGORY_META: Record<ExpenseCategory, { label: string; description: string; color: string }> = {
  HOUSING:            { label: 'Housing',            color: '#3B82F6', description: 'Rent, mortgage, property tax, home insurance, repairs, HOA fees' },
  FOOD:               { label: 'Food',               color: '#10B981', description: 'Groceries, restaurants, food delivery, coffee shops, meal kits' },
  TRANSPORTATION:     { label: 'Transportation',     color: '#F59E0B', description: 'Gas, car payments, Uber, Lyft, public transit, parking, tolls, car insurance' },
  UTILITIES:          { label: 'Utilities',          color: '#8B5CF6', description: 'Electricity, water, gas, internet, phone bills' },
  SUBSCRIPTIONS:      { label: 'Subscriptions',      color: '#EC4899', description: 'Streaming services (Netflix, Spotify), software, memberships, recurring apps' },
  HEALTHCARE:         { label: 'Healthcare',         color: '#06B6D4', description: 'Doctor visits, pharmacy, dental, vision, health insurance premiums, gym' },
  DEBT_PAYMENTS:      { label: 'Debt Payments',      color: '#EF4444', description: 'Credit card payments, loan payments, student loans — principal + interest' },
  SAVINGS_INVESTMENTS:{ label: 'Savings',            color: '#059669', description: 'Bank transfers to savings, investment contributions, 401k, IRA, brokerage deposits' },
  MISCELLANEOUS:      { label: 'Miscellaneous',      color: '#94A3B8', description: 'Anything that does not fit another category — review and recategorize if possible' },
};

// ─── Layer 3: Merchant registry ────────────────────────────────────────────────
// Known merchants → category (checked against normalizedName)

const MERCHANT_REGISTRY: [string | RegExp, ExpenseCategory, string][] = [
  // HOUSING
  ['zillow',        'HOUSING', 'Zillow is a real estate platform — likely rent or mortgage research'],
  ['airbnb',        'HOUSING', 'Airbnb is short-term accommodation — classified as housing'],
  ['apartments.com','HOUSING', 'Apartment search service — housing-related'],
  [/rent/i,         'HOUSING', 'Description contains "rent" — classified as a housing payment'],

  // FOOD — restaurants
  ['mcdonald',     'FOOD',   "McDonald's is a fast food restaurant — classified as Food"],
  ['starbucks',    'FOOD',   'Starbucks is a coffee/food retailer — classified as Food'],
  ['chipotle',     'FOOD',   'Chipotle is a restaurant — classified as Food'],
  ['subway',       'FOOD',   'Subway is a fast food restaurant — classified as Food'],
  ['dunkin',       'FOOD',   "Dunkin' is a coffee/food retailer — classified as Food"],
  ['panera',       'FOOD',   'Panera Bread is a restaurant chain — classified as Food'],
  ['domino',       'FOOD',   "Domino's is a pizza delivery service — classified as Food"],
  ['pizza hut',    'FOOD',   'Pizza Hut is a pizza restaurant — classified as Food'],
  ['chick-fil-a',  'FOOD',   'Chick-fil-A is a fast food restaurant — classified as Food'],
  ['doordash',     'FOOD',   'DoorDash is a food delivery app — classified as Food'],
  ['grubhub',      'FOOD',   'Grubhub is a food delivery app — classified as Food'],
  ['uber eats',    'FOOD',   'Uber Eats is a food delivery app — classified as Food'],
  ['instacart',    'FOOD',   'Instacart is a grocery delivery service — classified as Food'],
  ['whole foods',  'FOOD',   'Whole Foods Market is a grocery store — classified as Food'],
  ["trader joe",   'FOOD',   "Trader Joe's is a grocery store — classified as Food"],
  ['kroger',       'FOOD',   'Kroger is a grocery store chain — classified as Food'],
  ['safeway',      'FOOD',   'Safeway is a grocery store chain — classified as Food'],
  ['publix',       'FOOD',   'Publix is a grocery store chain — classified as Food'],
  ['aldi',         'FOOD',   'Aldi is a grocery store chain — classified as Food'],
  ['walmart',      'FOOD',   'Walmart is commonly used for groceries — classified as Food (review if large purchase)'],
  ['target',       'FOOD',   'Target frequently includes grocery purchases — classified as Food (review if non-grocery)'],
  ['costco',       'FOOD',   'Costco is commonly used for bulk groceries — classified as Food'],

  // TRANSPORTATION
  ['uber',         'TRANSPORTATION', 'Uber is a rideshare service — classified as Transportation'],
  ['lyft',         'TRANSPORTATION', 'Lyft is a rideshare service — classified as Transportation'],
  ['shell',        'TRANSPORTATION', 'Shell is a gas station — classified as Transportation'],
  ['chevron',      'TRANSPORTATION', 'Chevron is a gas station — classified as Transportation'],
  ['bp',           'TRANSPORTATION', 'BP is a gas station — classified as Transportation'],
  ['exxon',        'TRANSPORTATION', 'Exxon is a gas station — classified as Transportation'],
  ['speedway',     'TRANSPORTATION', 'Speedway is a gas station — classified as Transportation'],
  ['wawa',         'TRANSPORTATION', 'Wawa is a gas station/convenience store — classified as Transportation'],
  [/parking/i,     'TRANSPORTATION', 'Description contains "parking" — classified as Transportation'],
  [/toll/i,        'TRANSPORTATION', 'Description contains "toll" — classified as Transportation (road toll)'],
  [/transit/i,     'TRANSPORTATION', 'Description contains "transit" — classified as public Transportation'],

  // UTILITIES
  ['comcast',      'UTILITIES', 'Comcast is an internet/cable provider — classified as Utilities'],
  ['xfinity',      'UTILITIES', 'Xfinity (Comcast) is an internet/cable provider — classified as Utilities'],
  ['verizon',      'UTILITIES', 'Verizon is a phone/internet carrier — classified as Utilities'],
  ['at&t',         'UTILITIES', 'AT&T is a phone/internet carrier — classified as Utilities'],
  ['t-mobile',     'UTILITIES', 'T-Mobile is a mobile carrier — classified as Utilities'],
  ['sprint',       'UTILITIES', 'Sprint is a mobile carrier — classified as Utilities'],
  ['pg&e',         'UTILITIES', 'PG&E is an electricity/gas utility — classified as Utilities'],
  ['con ed',       'UTILITIES', 'Con Edison is a utility provider — classified as Utilities'],
  [/electric/i,    'UTILITIES', 'Description contains "electric" — classified as a Utilities payment'],
  [/water\s+bill/i,'UTILITIES', 'Description contains "water bill" — classified as Utilities'],
  [/internet/i,    'UTILITIES', 'Description contains "internet" — classified as Utilities'],

  // SUBSCRIPTIONS
  ['netflix',       'SUBSCRIPTIONS', 'Netflix is a streaming subscription — classified as Subscriptions'],
  ['spotify',       'SUBSCRIPTIONS', 'Spotify is a music streaming subscription — classified as Subscriptions'],
  ['hulu',          'SUBSCRIPTIONS', 'Hulu is a streaming subscription — classified as Subscriptions'],
  ['disney+',       'SUBSCRIPTIONS', 'Disney+ is a streaming subscription — classified as Subscriptions'],
  ['hbo',           'SUBSCRIPTIONS', 'HBO Max is a streaming subscription — classified as Subscriptions'],
  ['peacock',       'SUBSCRIPTIONS', 'Peacock is a streaming subscription — classified as Subscriptions'],
  ['amazon prime',  'SUBSCRIPTIONS', 'Amazon Prime is a subscription service — classified as Subscriptions'],
  ['youtube premium','SUBSCRIPTIONS','YouTube Premium is a subscription — classified as Subscriptions'],
  ['apple',         'SUBSCRIPTIONS', 'Apple charges commonly relate to App Store or iCloud subscriptions'],
  ['google',        'SUBSCRIPTIONS', 'Google charges commonly relate to Google One or Play subscriptions'],
  ['adobe',         'SUBSCRIPTIONS', 'Adobe is a software subscription — classified as Subscriptions'],
  ['microsoft',     'SUBSCRIPTIONS', 'Microsoft charges commonly relate to Microsoft 365 subscription'],

  // HEALTHCARE
  ['cvs',           'HEALTHCARE', 'CVS is a pharmacy/healthcare retailer — classified as Healthcare'],
  ['walgreens',     'HEALTHCARE', 'Walgreens is a pharmacy — classified as Healthcare'],
  ['rite aid',      'HEALTHCARE', 'Rite Aid is a pharmacy — classified as Healthcare'],
  ['planet fitness','HEALTHCARE', 'Planet Fitness is a gym membership — classified as Healthcare'],
  ['equinox',       'HEALTHCARE', 'Equinox is a gym/wellness club — classified as Healthcare'],
  [/pharmacy/i,     'HEALTHCARE', 'Description contains "pharmacy" — classified as Healthcare'],
  [/medical/i,      'HEALTHCARE', 'Description contains "medical" — classified as Healthcare'],
  [/dental/i,       'HEALTHCARE', 'Description contains "dental" — classified as Healthcare'],
  [/doctor/i,       'HEALTHCARE', 'Description contains "doctor" — classified as Healthcare'],
  [/hospital/i,     'HEALTHCARE', 'Description contains "hospital" — classified as Healthcare'],
  [/health/i,       'HEALTHCARE', 'Description contains "health" — classified as Healthcare'],

  // SAVINGS / INVESTMENTS
  ['fidelity',      'SAVINGS_INVESTMENTS', 'Fidelity is an investment platform — classified as Savings/Investments'],
  ['vanguard',      'SAVINGS_INVESTMENTS', 'Vanguard is an investment platform — classified as Savings/Investments'],
  ['schwab',        'SAVINGS_INVESTMENTS', 'Charles Schwab is an investment platform — classified as Savings/Investments'],
  ['robinhood',     'SAVINGS_INVESTMENTS', 'Robinhood is an investment app — classified as Savings/Investments'],
  ['coinbase',      'SAVINGS_INVESTMENTS', 'Coinbase is a crypto investment platform — classified as Savings/Investments'],
  [/401k/i,         'SAVINGS_INVESTMENTS', 'Description contains "401k" — classified as Savings/Investments'],
  [/transfer\s+to/i,'SAVINGS_INVESTMENTS', 'Transfer to another account — classified as Savings/Investments (review if a bill payment)'],
];

// ─── Layer 4: Keyword patterns ─────────────────────────────────────────────────

const KEYWORD_PATTERNS: [RegExp, ExpenseCategory, string, number][] = [
  // HOUSING (confidence ~80)
  [/\brent\b/i,          'HOUSING', 'Description contains "rent" — typically a monthly housing payment', 82],
  [/\bmortgage\b/i,      'HOUSING', 'Description contains "mortgage" — classified as Housing', 90],
  [/\bhoa\b/i,           'HOUSING', 'HOA = Homeowners Association fee — classified as Housing', 88],
  [/\bproperty\s+tax\b/i,'HOUSING', 'Description contains "property tax" — classified as Housing', 92],
  [/\binsurance\b/i,     'HOUSING', 'Description contains "insurance" — classified as Housing (review if health/auto)', 65],

  // FOOD (confidence ~75)
  [/\bgrocer/i,          'FOOD',    'Description contains "grocer" — classified as Food/Grocery', 85],
  [/\brestaurant\b/i,    'FOOD',    'Description contains "restaurant" — classified as Food', 88],
  [/\bdining\b/i,        'FOOD',    'Description contains "dining" — classified as Food', 85],
  [/\bcafe\b/i,          'FOOD',    'Description contains "cafe" — classified as Food/Coffee', 78],
  [/\bbakery\b/i,        'FOOD',    'Description contains "bakery" — classified as Food', 82],
  [/\bfood\b/i,          'FOOD',    'Description contains "food" — classified as Food', 72],
  [/\bpizza\b/i,         'FOOD',    'Description contains "pizza" — classified as Food/Restaurant', 86],
  [/\bburger\b/i,        'FOOD',    'Description contains "burger" — classified as Food/Restaurant', 84],
  [/\btacos\b/i,         'FOOD',    'Description contains "tacos" — classified as Food/Restaurant', 83],

  // TRANSPORTATION (confidence ~78)
  [/\bgas\s+station\b/i, 'TRANSPORTATION', 'Description contains "gas station" — classified as Transportation/Fuel', 90],
  [/\bfuel\b/i,          'TRANSPORTATION', 'Description contains "fuel" — classified as Transportation', 85],
  [/\bauto\s+pay\b/i,    'TRANSPORTATION', 'Description contains "auto pay" — likely car payment or insurance', 70],
  [/\bcar\s+(loan|payment|insurance)\b/i, 'TRANSPORTATION', 'Description references a car payment or insurance — classified as Transportation', 88],
  [/\bairline\b/i,       'TRANSPORTATION', 'Description contains "airline" — classified as Transportation/Travel', 80],
  [/\bflight\b/i,        'TRANSPORTATION', 'Description contains "flight" — classified as Transportation/Travel', 78],

  // UTILITIES (confidence ~82)
  [/\butility\b/i,       'UTILITIES', 'Description contains "utility" — classified as Utilities', 85],
  [/\butilities\b/i,     'UTILITIES', 'Description contains "utilities" — classified as Utilities', 87],
  [/\belectric\b/i,      'UTILITIES', 'Description contains "electric" — classified as Utilities/Electricity', 86],
  [/\bgas\s+bill\b/i,    'UTILITIES', 'Description contains "gas bill" — classified as Utilities/Gas', 90],
  [/\bcable\b/i,         'UTILITIES', 'Description contains "cable" — classified as Utilities/Cable TV', 80],
  [/\bwireless\b/i,      'UTILITIES', 'Description contains "wireless" — likely phone bill, classified as Utilities', 78],

  // SUBSCRIPTIONS (confidence ~75)
  [/\bsubscription\b/i,  'SUBSCRIPTIONS', 'Description contains "subscription" — classified as Subscriptions', 90],
  [/\bmembership\b/i,    'SUBSCRIPTIONS', 'Description contains "membership" — classified as Subscriptions', 78],
  [/\bmonthly\s+fee\b/i, 'SUBSCRIPTIONS', 'Description contains "monthly fee" — classified as Subscriptions', 75],
  [/\bstreaming\b/i,     'SUBSCRIPTIONS', 'Description contains "streaming" — classified as Subscriptions', 85],
  [/\bpremium\b/i,       'SUBSCRIPTIONS', 'Description contains "premium" — likely a subscription tier, classified as Subscriptions', 68],

  // HEALTHCARE (confidence ~78)
  [/\bpharmacy\b/i,      'HEALTHCARE', 'Description contains "pharmacy" — classified as Healthcare', 90],
  [/\bclinic\b/i,        'HEALTHCARE', 'Description contains "clinic" — classified as Healthcare', 88],
  [/\bvision\b/i,        'HEALTHCARE', 'Description contains "vision" — likely eyecare, classified as Healthcare', 80],
  [/\boptical\b/i,       'HEALTHCARE', 'Description contains "optical" — classified as Healthcare/Vision', 82],
  [/\bgym\b/i,           'HEALTHCARE', 'Description contains "gym" — classified as Healthcare/Fitness', 76],
  [/\bfitness\b/i,       'HEALTHCARE', 'Description contains "fitness" — classified as Healthcare/Fitness', 78],
  [/\bwellness\b/i,      'HEALTHCARE', 'Description contains "wellness" — classified as Healthcare', 72],

  // DEBT PAYMENTS (confidence ~85)
  [/\bloan\s+payment\b/i,'DEBT_PAYMENTS', 'Description contains "loan payment" — classified as Debt Payments', 92],
  [/\bstudent\s+loan\b/i,'DEBT_PAYMENTS', 'Description contains "student loan" — classified as Debt Payments', 95],
  [/\bcredit\s+card\s+payment\b/i, 'DEBT_PAYMENTS', 'Description contains "credit card payment" — classified as Debt Payments', 95],
  [/\bminimum\s+payment\b/i, 'DEBT_PAYMENTS', 'Description contains "minimum payment" — classified as Debt Payments', 90],

  // SAVINGS / INVESTMENTS (confidence ~80)
  [/\bsavings\s+(transfer|deposit)\b/i, 'SAVINGS_INVESTMENTS', 'Description references a savings transfer — classified as Savings/Investments', 88],
  [/\binvestment\b/i,    'SAVINGS_INVESTMENTS', 'Description contains "investment" — classified as Savings/Investments', 85],
  [/\bretirement\b/i,    'SAVINGS_INVESTMENTS', 'Description contains "retirement" — likely 401k or IRA contribution', 90],
  [/\bira\b/i,           'SAVINGS_INVESTMENTS', 'IRA = Individual Retirement Account contribution — classified as Savings/Investments', 92],
];

// ─── Layer 5: Pattern inference ────────────────────────────────────────────────
// Uses amount size and day-of-month patterns

export function inferFromPattern(amount: number, dayOfMonth: number): { category: ExpenseCategory; confidence: number; explanation: string } | null {
  // Large round amounts on the 1st or last day → likely rent/mortgage
  if (amount >= 800 && amount <= 5000 && amount % 50 === 0 && (dayOfMonth <= 5 || dayOfMonth >= 28)) {
    return {
      category: 'HOUSING',
      confidence: 55,
      explanation: `Amount of $${amount.toFixed(0)} is a large round number paid around the start/end of the month — matches a rent or mortgage payment pattern. Confirm if correct.`,
    };
  }

  // Very small amounts ($2–$20) → likely coffee/food or small subscription
  if (amount >= 2 && amount <= 20) {
    return {
      category: 'FOOD',
      confidence: 45,
      explanation: `Amount of $${amount.toFixed(2)} is small ($2–$20), which commonly indicates a coffee shop, fast food, or food purchase. Review to confirm.`,
    };
  }

  // Monthly ~$10–$20 → likely streaming subscription
  if (amount >= 5 && amount <= 25 && amount % 0.99 === 0) {
    return {
      category: 'SUBSCRIPTIONS',
      confidence: 50,
      explanation: `Amount of $${amount.toFixed(2)} matches a common subscription pricing pattern (e.g., $9.99, $14.99). Review to confirm.`,
    };
  }

  return null;
}

// ─── ReDoS-safe regex execution ───────────────────────────────────────────────

/**
 * Validates that a user-supplied regex pattern is safe to execute.
 *
 * Rejects patterns that are known to cause catastrophic backtracking:
 *   - Patterns with nested quantifiers like (a+)+ or (x|x)+
 *   - Patterns exceeding the length limit
 *
 * This is a first-pass static check. Combined with the try/catch in
 * safeRegexTest, it prevents DoS from malicious or accidental patterns.
 */
export function isRegexSafe(pattern: string): boolean {
  if (pattern.length > 200) return false;

  // Block patterns with nested quantifiers (catastrophic backtracking triggers)
  const dangerous = [
    /(\(.*\+.*\)|\(.*\*.*\))[+*]/,   // (x+)+ or (x+)*
    /(\[.*\])[+*][+*]/,               // [abc]++ style double quantifiers
    /(\(.*\|.*\))[+*]/,               // (x|y)+ style alternation loops
    /\{[0-9]+,[0-9]*\}\s*[+*{]/,      // bounded quantifiers followed by more quantifiers
  ];

  for (const d of dangerous) {
    if (d.test(pattern)) return false;
  }

  // Ensure the pattern actually compiles
  try {
    new RegExp(pattern, 'i');
    return true;
  } catch {
    return false;
  }
}

/**
 * Executes a user-supplied regex with a synchronous timeout guard.
 * Returns false if the pattern is unsafe, invalid, or takes too long.
 */
function safeRegexTest(pattern: string, input: string): boolean {
  if (!isRegexSafe(pattern)) return false;

  try {
    const re = new RegExp(pattern, 'i');

    // Limit input length to prevent slow-but-valid patterns on huge strings
    const capped = input.length > 500 ? input.slice(0, 500) : input;
    return re.test(capped);
  } catch {
    return false;
  }
}

// ─── Main classification function ─────────────────────────────────────────────

export function classifyTransaction(
  normalizedName: string,
  rawDescription: string,
  amount: number,
  date: Date,
  userRules: UserRule[] = [],
): ClassificationResult {
  const searchText = normalizedName.toLowerCase();
  const rawLower = rawDescription.toLowerCase();

  // ── Layer 1: User-defined rules (highest priority) ──────────────────────────
  const sortedUserRules = [...userRules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedUserRules) {
    const pattern = rule.pattern.toLowerCase();
    let matches = false;

    switch (rule.patternType) {
      case 'CONTAINS':    matches = searchText.includes(pattern) || rawLower.includes(pattern); break;
      case 'STARTS_WITH': matches = searchText.startsWith(pattern) || rawLower.startsWith(pattern); break;
      case 'ENDS_WITH':   matches = searchText.endsWith(pattern) || rawLower.endsWith(pattern); break;
      case 'EXACT':       matches = searchText === pattern || rawLower === pattern; break;
      case 'REGEX': {
        matches = safeRegexTest(rule.pattern, searchText) || safeRegexTest(rule.pattern, rawLower);
        break;
      }
    }

    if (matches) {
      return {
        category: rule.category,
        confidence: 99,
        explanation: `You previously set a rule: transactions matching "${rule.pattern}" → ${CATEGORY_META[rule.category].label}. This rule always takes priority.`,
        classifiedBy: 'USER_RULE',
      };
    }
  }

  // ── Layer 2: System rules ──────────────────────────────────────────────────
  // (Applied before merchant registry — these are hard-coded high-confidence patterns)
  for (const [kw, cat, exp, conf] of KEYWORD_PATTERNS) {
    if (kw.test(searchText) || kw.test(rawLower)) {
      // Only use as Layer 2 if confidence >= 88 (system rule threshold)
      if (conf >= 88) {
        return { category: cat, confidence: conf, explanation: exp, classifiedBy: 'SYSTEM_RULE' };
      }
    }
  }

  // ── Layer 3: Merchant registry ──────────────────────────────────────────────
  for (const [matcher, cat, exp] of MERCHANT_REGISTRY) {
    const matched =
      typeof matcher === 'string'
        ? searchText.includes(matcher.toLowerCase()) || rawLower.includes(matcher.toLowerCase())
        : matcher.test(searchText) || matcher.test(rawLower);

    if (matched) {
      return {
        category: cat,
        confidence: 91,
        explanation: exp,
        classifiedBy: 'MERCHANT_DB',
      };
    }
  }

  // ── Layer 4: Keyword matching (medium confidence) ───────────────────────────
  let bestKwMatch: ClassificationResult | null = null;

  for (const [kw, cat, exp, conf] of KEYWORD_PATTERNS) {
    if (kw.test(searchText) || kw.test(rawLower)) {
      if (!bestKwMatch || conf > bestKwMatch.confidence) {
        bestKwMatch = { category: cat, confidence: conf, explanation: exp, classifiedBy: 'KEYWORD_MATCH' };
      }
    }
  }

  if (bestKwMatch) return bestKwMatch;

  // ── Layer 5: Pattern inference ──────────────────────────────────────────────
  const inferred = inferFromPattern(amount, date.getDate());
  if (inferred) {
    return { ...inferred, classifiedBy: 'PATTERN_INFERENCE' };
  }

  // ── Layer 6: Fallback ──────────────────────────────────────────────────────
  return {
    category: 'MISCELLANEOUS',
    confidence: 25,
    explanation: `No matching rule, merchant, or keyword pattern was found for "${normalizedName}". Classified as Miscellaneous — please review and correct the category so the system learns for next time.`,
    classifiedBy: 'FALLBACK',
  };
}

// ─── Aggregate spending by category ──────────────────────────────────────────

export interface CategorySummary {
  category: ExpenseCategory;
  label: string;
  color: string;
  totalAmount: number;
  transactionCount: number;
  averageConfidence: number;
  lowConfidenceCount: number;  // confidence < 60
  description: string;
}

export function aggregateByCategory(
  transactions: { category: ExpenseCategory; amount: number; confidence: number; userCategory?: ExpenseCategory | null }[]
): CategorySummary[] {
  const map = new Map<ExpenseCategory, { total: number; count: number; confidenceSum: number; lowConf: number }>();

  for (const tx of transactions) {
    const cat = tx.userCategory ?? tx.category;
    const existing = map.get(cat) ?? { total: 0, count: 0, confidenceSum: 0, lowConf: 0 };
    map.set(cat, {
      total: existing.total + tx.amount,
      count: existing.count + 1,
      confidenceSum: existing.confidenceSum + tx.confidence,
      lowConf: existing.lowConf + (tx.confidence < 60 ? 1 : 0),
    });
  }

  return Array.from(map.entries())
    .map(([cat, data]) => ({
      category: cat,
      label: CATEGORY_META[cat].label,
      color: CATEGORY_META[cat].color,
      description: CATEGORY_META[cat].description,
      totalAmount: data.total,
      transactionCount: data.count,
      averageConfidence: Math.round(data.confidenceSum / data.count),
      lowConfidenceCount: data.lowConf,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}
