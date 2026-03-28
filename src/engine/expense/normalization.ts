/**
 * Normalization Layer
 *
 * Converts raw bank/card descriptions into clean merchant names.
 * Preserves the original raw_description — never modifies it.
 *
 * Pipeline:
 *   rawDescription → stripNoise → extractMerchant → standardizeCase → normalizedName
 */

// ─── Noise patterns (ordered by specificity, highest first) ──────────────────

const NOISE_PATTERNS: RegExp[] = [
  // Transaction IDs and reference numbers
  /\*[A-Z0-9]{4,}/gi,           // *AB12, *9X4Y
  /\s+#\d{3,}/g,                // #1234, #56789
  /\s+\d{4,}$/g,                // trailing numbers (store ID, etc.)

  // Location suffixes
  /\s+[A-Z]{2}\s*\d{5}(-\d{4})?$/g,  // TX 75201 or TX75201-1234
  /\s+[A-Z]{2}$/g,              // trailing state code: TX, CA, NY
  /\s+\d{1,2}\/\d{1,2}$/g,     // date suffixes: 12/15

  // Card processor noise
  /\s*\d{4}\s*$/g,              // trailing 4-digit (card last 4)
  /\s+SQ\s*/gi,                 // Square POS prefix
  /^SQ\s+/gi,                   // Square POS prefix at start
  /\s+POS\s*/gi,                // POS identifier
  /\s+PURCHASE\s*/gi,           // PURCHASE noise word
  /\s+DEBIT\s*/gi,              // DEBIT noise word
  /\s+CREDIT\s*/gi,             // CREDIT noise word
  /\s+ONLINE\s*$/gi,            // ONLINE suffix

  // ACH / wire noise
  /\s+ACH\s*/gi,
  /\s+CHECKCARD\s*/gi,
  /\s+CHECK\s*CARD\s*/gi,
  /\s+PAYMT\s*/gi,

  // Date patterns embedded in description
  /\s+\d{2}-\d{2}-\d{4}/g,     // 01-15-2024
  /\s+\d{4}-\d{2}-\d{2}/g,     // 2024-01-15
];

// ─── Merchant alias registry ──────────────────────────────────────────────────
// Maps partial/noisy bank names → clean display names

const MERCHANT_ALIASES: [RegExp, string][] = [
  // Retail / General
  [/amazon/i,         'Amazon'],
  [/amzn/i,           'Amazon'],
  [/walmart/i,        'Walmart'],
  [/target/i,         'Target'],
  [/costco/i,         'Costco'],
  [/sam.?s\s*club/i,  "Sam's Club"],
  [/best\s*buy/i,     'Best Buy'],
  [/home\s*depot/i,   'Home Depot'],
  [/lowes?/i,         "Lowe's"],
  [/ikea/i,           'IKEA'],
  [/etsy/i,           'Etsy'],
  [/ebay/i,           'eBay'],

  // Food & Grocery
  [/whole\s*foods/i,  'Whole Foods'],
  [/trader\s*joe/i,   "Trader Joe's"],
  [/kroger/i,         'Kroger'],
  [/safeway/i,        'Safeway'],
  [/publix/i,         'Publix'],
  [/aldi/i,           'Aldi'],
  [/sprouts/i,        'Sprouts'],
  [/doordash/i,       'DoorDash'],
  [/grubhub/i,        'Grubhub'],
  [/ubereats/i,       'Uber Eats'],
  [/instacart/i,      'Instacart'],
  [/chipotle/i,       'Chipotle'],
  [/mcdonald/i,       "McDonald's"],
  [/starbucks/i,      'Starbucks'],
  [/subway/i,         'Subway'],
  [/dunkin/i,         "Dunkin'"],
  [/panera/i,         'Panera Bread'],
  [/chick.?fil.?a/i,  'Chick-fil-A'],
  [/domino/i,         "Domino's"],
  [/pizza\s*hut/i,    'Pizza Hut'],

  // Transportation
  [/uber\b/i,         'Uber'],
  [/lyft/i,           'Lyft'],
  [/shell\b/i,        'Shell'],
  [/chevron/i,        'Chevron'],
  [/bp\b/i,           'BP'],
  [/exxon/i,          'Exxon'],
  [/marathon\s*gas/i, 'Marathon Gas'],
  [/speedway/i,       'Speedway'],
  [/wawa/i,           'Wawa'],

  // Streaming / Subscriptions
  [/netflix/i,        'Netflix'],
  [/spotify/i,        'Spotify'],
  [/hulu/i,           'Hulu'],
  [/disney\s*\+/i,    'Disney+'],
  [/apple\.com/i,     'Apple'],
  [/itunes/i,         'Apple'],
  [/google\s*(play|store)?/i, 'Google'],
  [/youtube\s*(premium)?/i, 'YouTube Premium'],
  [/amazon\s*prime/i, 'Amazon Prime'],
  [/hbo/i,            'HBO Max'],
  [/peacock/i,        'Peacock'],

  // Utilities / Services
  [/comcast/i,        'Comcast'],
  [/xfinity/i,        'Xfinity'],
  [/at&t/i,           'AT&T'],
  [/verizon/i,        'Verizon'],
  [/t-mobile/i,       'T-Mobile'],
  [/sprint/i,         'Sprint'],
  [/pg&?e/i,          'PG&E'],
  [/con\s*ed/i,       'Con Edison'],

  // Financial
  [/paypal/i,         'PayPal'],
  [/venmo/i,          'Venmo'],
  [/zelle/i,          'Zelle'],
  [/chase\b/i,        'Chase'],
  [/bank\s*of\s*america/i, 'Bank of America'],
  [/wells\s*fargo/i,  'Wells Fargo'],
  [/capital\s*one/i,  'Capital One'],

  // Healthcare
  [/cvs/i,            'CVS'],
  [/walgreen/i,       'Walgreens'],
  [/rite\s*aid/i,     'Rite Aid'],

  // Fitness
  [/planet\s*fitness/i, 'Planet Fitness'],
  [/24\s*hour\s*fitness/i, '24 Hour Fitness'],
  [/equinox/i,        'Equinox'],
  [/anytime\s*fitness/i, 'Anytime Fitness'],
];

// ─── Core normalization function ──────────────────────────────────────────────

export function normalizeDescription(raw: string): string {
  let text = raw.trim();

  // Step 1: Apply merchant alias registry first (before stripping noise)
  for (const [pattern, alias] of MERCHANT_ALIASES) {
    if (pattern.test(text)) {
      return alias;
    }
  }

  // Step 2: Strip noise patterns
  for (const pattern of NOISE_PATTERNS) {
    text = text.replace(pattern, ' ');
  }

  // Step 3: Clean up remaining whitespace
  text = text
    .replace(/\s{2,}/g, ' ')   // collapse multiple spaces
    .replace(/[-_]+$/, '')     // strip trailing hyphens/underscores
    .replace(/^[-_]+/, '')     // strip leading hyphens/underscores
    .trim();

  // Step 4: Title case (capitalize first letter of each word)
  text = text
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return text || raw.trim(); // fallback to raw if normalization produces empty string
}

// ─── Dedupe hash (deterministic) ─────────────────────────────────────────────

export function buildDedupeHash(date: Date, amount: number, normalizedName: string): string {
  // Simple deterministic hash using string concatenation
  // Production would use crypto.createHash('sha256') but this avoids Node deps in edge
  const key = `${date.toISOString().slice(0, 10)}|${amount.toFixed(2)}|${normalizedName.toLowerCase()}`;
  // Simple djb2-style hash for browser compatibility
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) + key.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
