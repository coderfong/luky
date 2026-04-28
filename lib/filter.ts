// Content safety guard applied before every Grok API call and after every response.
// Grok's safety is weaker than Claude — we must catch gambling-adjacent content here.
//
// This is a defense-in-depth layer. The system prompt also forbids these terms,
// but a model can still slip; this filter rejects unsafe output before users see it.

const BLOCKED_TERMS = [
  // gambling verbs / actors
  'gamble', 'gambling', 'gambler',
  'casino', 'casinos',
  'lottery', 'lotteries', 'lotto',
  'jackpot', 'jackpots',
  'wager', 'wagering',
  'keno', 'sweepstakes',
  // betting
  'betting', 'bettor', 'bet on', 'place a bet', 'placing a bet',
  'football bet', 'sports bet', 'sportsbetting', 'sportsbook',
  // operators / brands we must not pretend to be / link to
  'singapore pools', 'sg pools', 'sgpools',
  'toto', '4d', '4-d', 'big sweep',
  // prediction language
  'tipster', 'winning numbers', 'predict winning', 'predict the win',
  'guaranteed win', 'sure win', 'sure-win',
  'pick numbers to win', 'numbers that win', 'numbers to win',
  'which numbers will', 'will win',
  // "lucky number" framing slips toward gambling — block it; we use "blessed"
  'lucky number', 'lucky numbers', 'lucky digit', 'lucky digits',
  'luckiest number',
] as const;

export type FilterResult =
  | { safe: true }
  | { safe: false; reason: 'empty' | 'too_short' | 'gambling_reference' };

export function checkContent(input: string): FilterResult {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { safe: false, reason: 'empty' };
  }

  const lower = trimmed.toLowerCase();

  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return { safe: false, reason: 'gambling_reference' };
    }
  }

  return { safe: true };
}

// Soft-rewrite pass for AI output that *almost* slipped — replace any prediction
// or "lucky" framing with neutral cultural-reflection language. This runs AFTER
// checkContent has already approved the output, so it only handles edge cases
// like casing variations the block-list missed.
const REWRITES: Array<[RegExp, string]> = [
  [/\bguaranteed\b/gi, 'meaningful'],
  [/\bsure[-\s]?win(s|ning)?\b/gi, 'auspicious'],
  [/\bpredict(s|ed|ing)?\b/gi, 'reflects'],
  [/\bwill bring (you )?wealth\b/gi, 'is associated with abundance'],
  [/\bincrease your odds\b/gi, 'invite reflection'],
  [/\bbeat the odds\b/gi, 'walk with care'],
  [/\bhigher chance\b/gi, 'meaningful resonance'],
  [/\blikely to win\b/gi, 'culturally auspicious'],
  // Fallback "lucky" → "blessed" if any survived the block list (e.g. "Lucky day")
  [/\blucky\b/gi, 'blessed'],
];

export function sanitiseEntertainment(input: string): string {
  let out = input;
  for (const [pattern, replacement] of REWRITES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
