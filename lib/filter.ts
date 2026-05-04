// Content safety guard applied before every Grok API call and after every response.
//
// ─── PROTOTYPE_MODE ────────────────────────────────────────────────
// 2026-05-03 — at the user's explicit request, prototyping with TOTO/4D
// "lucky number" framing while we evaluate App Store strategy. The full
// block list and the strict rewriter are *suspended* below. Flip
// PROTOTYPE_MODE to `false` (or remove the flag) before submitting to
// the App Store — at that point all the prior blocks must come back,
// the disclaimer stays explicit, and the safety tests must pass.
// See CLAUDE.md → "PROTOTYPE_MODE — gambling rules suspended".
export const PROTOTYPE_MODE = true;

// Strict block list — re-engaged when PROTOTYPE_MODE is false.
const BLOCKED_TERMS_STRICT = [
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

// Prototype block list — keeps things that would create real legal
// exposure even in a prototype: pretending to BE an operator, claiming
// guaranteed wins, etc. Notably DOES NOT block "toto", "4d", "lucky".
const BLOCKED_TERMS_PROTOTYPE = [
  // pretending to be / endorsing the actual operators is still a no
  'singapore pools', 'sg pools', 'sgpools',
  'tote board',
  // never claim certainty
  'guaranteed win', 'sure win', 'sure-win',
  'guaranteed jackpot', 'guaranteed to win',
  'will definitely win', 'you will win',
] as const;

const BLOCKED_TERMS: readonly string[] = PROTOTYPE_MODE
  ? BLOCKED_TERMS_PROTOTYPE
  : BLOCKED_TERMS_STRICT;

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

// Soft-rewrite pass — runs AFTER checkContent.
// In PROTOTYPE_MODE we keep only the minimum: rewrite "guaranteed" /
// "sure win" claims into softer language so we never promise a win.
// In strict mode this also rewrites "lucky" → "blessed" etc.
const REWRITES_STRICT: Array<[RegExp, string]> = [
  [/\bguaranteed\b/gi, 'meaningful'],
  [/\bsure[-\s]?win(s|ning)?\b/gi, 'auspicious'],
  [/\bpredict(s|ed|ing)?\b/gi, 'reflects'],
  [/\bwill bring (you )?wealth\b/gi, 'is associated with abundance'],
  [/\bincrease your odds\b/gi, 'invite reflection'],
  [/\bbeat the odds\b/gi, 'walk with care'],
  [/\bhigher chance\b/gi, 'meaningful resonance'],
  [/\blikely to win\b/gi, 'culturally auspicious'],
  [/\blucky\b/gi, 'blessed'],
];

const REWRITES_PROTOTYPE: Array<[RegExp, string]> = [
  // Never let the model promise certainty even in prototype mode.
  [/\bguaranteed (win|jackpot)\b/gi, 'auspicious $1'],
  [/\bsure[-\s]?win\b/gi, 'auspicious pick'],
  [/\bwill (definitely )?win\b/gi, 'may resonate'],
];

const REWRITES = PROTOTYPE_MODE ? REWRITES_PROTOTYPE : REWRITES_STRICT;

export function sanitiseEntertainment(input: string): string {
  let out = input;
  for (const [pattern, replacement] of REWRITES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
