export const DIGIT_MEANING: Record<number, string> = {
  0: 'Infinity · wholeness',
  1: 'New beginnings · first steps',
  2: 'Easy path · smooth flow (易)',
  3: 'Growth · birth energy (生)',
  4: 'Transformation · inner strength',
  5: 'Balance · the self',
  6: 'Flow · success (流)',
  7: 'Rising · certainty',
  8: 'Prosperity · wealth energy (發)',
  9: 'Eternity · longevity (久)',
};

// One-line cultural notes for numbers 1–49 in the SE Asian numerology tradition.
// Used in the home screen featured-numbers list and in the analysis stub when the
// AI is unavailable. Phrasing avoids "lucky"; prefers "fortune", "blessed", "auspicious".
export const CULTURAL_NUMBER_NOTES: Record<number, string> = {
  1:  'New beginnings · the first step of a path',
  2:  'Smooth pairing · easy flow between two energies',
  3:  'Birth and growth (生) · life starting to bloom',
  6:  'Smooth flow (流) · effortless progress',
  7:  'Rising spirit · steady ascent',
  8:  'Prosperity (發) · the classic wealth number',
  9:  'Longevity (久) · enduring blessings',
  11: 'Twin pillars · clarity in decisions',
  13: 'Growth from small beginnings',
  16: 'Smooth wealth · gentle abundance',
  17: 'Steady rise · momentum that lasts',
  18: 'A lifetime of prosperity (一生發)',
  22: 'Builder\'s number · turning vision into form',
  23: 'Grace under change',
  26: 'Easy flow toward abundance',
  27: 'Quiet ascent · careful progress',
  28: 'Easy money · steady gain (易發)',
  33: 'Generations of growth · family blessings',
  36: 'Balance number linked to movement · journeys and travel',
  38: 'Endless flowing wealth (生發)',
  39: 'Growth and long-lasting fortune',
  44: 'Doubled transformation · deep inner change',
  48: 'Fourfold prosperity · quiet, accumulating wealth',
  49: 'A long, full life journey',
};

// Numbers traditionally seen as carrying disharmony in some SE Asian
// numerology readings — used by the daily extras card.
const DISHARMONY_POOL = [4, 14, 24, 34, 44];

export interface DailyExtras {
  theme: string;
  bestTiming: string;
  direction: string;
  avoid: number[];
}

const THEMES = [
  'Smooth prosperity', 'Quiet abundance', 'Steady ascent',
  'Gentle blessings', 'Auspicious flow', 'Warm fortune',
  'Open horizons', 'Patient growth', 'Bright clarity',
  'Calm strength', 'Generous spirit',
];
const TIMINGS = [
  'Morning · before noon', 'Midday', 'Late afternoon',
  'Evening · after 6pm', 'Twilight hour', 'Early evening',
];
const DIRECTIONS = ['East · 東', 'South · 南', 'North · 北', 'West · 西', 'Southeast · 東南', 'Southwest · 西南'];

/**
 * Daily extras — theme, best timing, auspicious direction, and numbers to
 * avoid. Deterministic per SGT date so all users see the same card on the
 * same day, like the featured numbers.
 */
export function getDailyExtras(): DailyExtras {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const seed = parseInt(sgt.toISOString().split('T')[0].replace(/-/g, ''), 10);
  // Decorrelate the four picks so consecutive days don't all rotate together.
  const t = (seed * 9301 + 49297) % THEMES.length;
  const ti = (seed * 1103 + 12345) % TIMINGS.length;
  const d = (seed * 4391 + 7919) % DIRECTIONS.length;
  // Pick 3 distinct numbers from the disharmony pool.
  const avoid: number[] = [];
  let s = seed >>> 0;
  while (avoid.length < 3) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const n = DISHARMONY_POOL[s % DISHARMONY_POOL.length];
    if (!avoid.includes(n)) avoid.push(n);
  }
  return {
    theme: THEMES[t],
    bestTiming: TIMINGS[ti],
    direction: DIRECTIONS[d],
    avoid: avoid.sort((a, b) => a - b),
  };
}

export const INTENTIONS = [
  { id: 'wealth',   label: 'Wealth',      glyph: '財', en: 'Wealth & abundance' },
  { id: 'luck',     label: 'Fortune',     glyph: '運', en: 'Auspicious flow' },
  { id: 'love',     label: 'Love',        glyph: '愛', en: 'Heart & union' },
  { id: 'career',   label: 'Career',      glyph: '職', en: 'Work & ascent' },
  { id: 'health',   label: 'Health',      glyph: '安', en: 'Body & peace' },
  { id: 'exams',    label: 'Exams',       glyph: '試', en: 'Study & focus' },
  { id: 'business', label: 'Business',    glyph: '商', en: 'Trade & dealings' },
  { id: 'travel',   label: 'Travel',      glyph: '行', en: 'Safe passage' },
  { id: 'protect',  label: 'Protection',  glyph: '護', en: 'Shield & guard' },
  { id: 'fresh',    label: 'Fresh start', glyph: '新', en: 'New horizon' },
  { id: 'blessing', label: 'Blessing',    glyph: '福', en: 'Everyday grace' },
] as const;

export type IntentionId = (typeof INTENTIONS)[number]['id'];

export const AUSPICIOUS_COLORS: Record<IntentionId, { name: string; hex: string }> = {
  wealth:   { name: 'Imperial Gold',  hex: '#C9A24A' },
  luck:     { name: 'Jade Green',     hex: '#4A8C5C' },
  love:     { name: 'Cinnabar',       hex: '#C8362C' },
  career:   { name: 'Ink Black',      hex: '#1B1410' },
  health:   { name: 'Jade Mist',      hex: '#6F8E7E' },
  exams:    { name: 'Mulberry',       hex: '#6B2737' },
  business: { name: 'Seal Red',       hex: '#8B1D18' },
  travel:   { name: 'Sky Ivory',      hex: '#EFE7D4' },
  protect:  { name: 'Temple Gold',    hex: '#B78B3A' },
  fresh:    { name: 'Paper White',    hex: '#F5EEE1' },
  blessing: { name: 'Vermilion',      hex: '#D94F34' },
};

export const AFFIRMATIONS = [
  'Good fortune gathers where patience waits.',
  'The door that opens twice is meant for you.',
  'Abundance arrives in the company of kindness.',
  'What you tend with attention will flower.',
  'A calm heart is the first charm.',
  'Small acts of care fill the bowl. Begin today.',
  'Wealth follows those who do not chase.',
  'The path is lit for those who prepare with care.',
];

const DAILY_AUSPICIOUS_POOL = [
  6, 8, 9, 16, 18, 26, 28, 36, 38, 3, 13, 23, 33, 7, 17, 27, 48, 11, 22, 44,
];

/**
 * Derive today's featured auspicious numbers, consistent for all users on the same SGT date.
 * Draws from a curated pool so numbers are always culturally meaningful.
 */
export function getDailyFeaturedNumbers(count = 3): number[] {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const dateSeed = parseInt(sgt.toISOString().split('T')[0].replace(/-/g, ''), 10);
  const remaining = [...DAILY_AUSPICIOUS_POOL];
  const result: number[] = [];
  let seed = ((dateSeed * 1664525 + 1013904223) >>> 0);
  while (result.length < Math.min(count, remaining.length)) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const idx = seed % remaining.length;
    result.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return result;
}

/** Reduce a number into the range 1–49. */
function collapseToRange(n: number): number {
  let v = Math.abs(n);
  while (v > 49) v = String(v).split('').reduce((a, d) => a + parseInt(d, 10), 0);
  return v < 1 ? 1 : v;
}

/** Convert a name to a numerology number (Pythagorean, collapsed to 1–49). */
export function nameToNumber(name: string): number {
  const clean = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return 1;
  const sum = clean.split('').reduce((acc, ch) => acc + (ch.charCodeAt(0) - 64), 0);
  return collapseToRange(sum);
}

/** Extract raw numbers from a birthdate string (YYYY-MM-DD). */
function birthdateNumbers(birthdate: string): number[] {
  const [yearStr, monthStr, dayStr] = birthdate.split('-');
  if (!yearStr || !monthStr || !dayStr) return [];
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return [];

  const allDigits = birthdate.replace(/\D/g, '');
  const lifePathSum = allDigits.split('').reduce((a, d) => a + parseInt(d, 10), 0);

  return [
    day,
    month,
    collapseToRange(lifePathSum),
    collapseToRange(year % 100 || year),
    collapseToRange(day + month),
    collapseToRange(day * (month || 1)),
  ].filter((n) => n >= 1 && n <= 49);
}

// Each Chinese zodiac animal carries a small set of culturally resonant
// numbers in SE Asian numerology folk tradition. Used as one of several
// signals when personalising a reading — never authoritative on its own.
const ZODIAC_SEEDS: Record<string, number[]> = {
  Rat:     [2, 3, 11, 22, 33],
  Ox:      [1, 4, 9, 19, 41],
  Tiger:   [1, 3, 7, 17, 27],
  Rabbit:  [3, 4, 6, 16, 36],
  Dragon:  [1, 6, 7, 16, 38],
  Snake:   [2, 8, 9, 26, 38],
  Horse:   [2, 3, 7, 23, 39],
  Goat:    [3, 9, 4, 13, 39],
  Monkey:  [1, 7, 8, 28, 47],
  Rooster: [5, 7, 8, 28, 38],
  Dog:     [3, 4, 9, 13, 39],
  Pig:     [2, 5, 8, 18, 28],
};

const INTENTION_SEEDS: Record<string, number[]> = {
  wealth:   [8, 28, 38, 18, 48, 6, 16, 26],
  luck:     [3, 13, 23, 33, 43, 7, 17, 27],
  love:     [6, 16, 26, 36, 2, 12, 22, 32],
  career:   [1, 11, 21, 31, 41, 9, 19, 29],
  health:   [5, 15, 25, 35, 45, 4, 14, 24],
  exams:    [4, 14, 24, 34, 44, 7, 17, 27],
  business: [8, 6, 16, 26, 36, 18, 28, 38],
  travel:   [9, 19, 29, 39, 49, 7, 17, 27],
  protect:  [7, 17, 27, 37, 47, 3, 13, 23],
  fresh:    [1, 11, 21, 31, 41, 9, 19, 29],
  blessing: [8, 6, 9, 18, 28, 38, 16, 26],
};

export interface PersonalSignals {
  zodiac?: string;
  favouriteNumber?: number;
  signalNumber?: number;     // today's tapped signal
  avoidNumbers?: number[];   // pantang list — removed from output if pantangMode is on
  pantangMode?: boolean;
}

/**
 * Derive `count` personalised numbers (1–49) from a user's profile and intentions.
 * Numbers are deterministic — same inputs always produce the same results.
 *
 * Extra signals (zodiac, favourite number, today's signal number) are folded in
 * before the random fill so they're more likely to surface. When pantangMode
 * is on, avoidNumbers are excluded from the output entirely.
 */
export function deriveFromProfile(
  birthdate: string,
  name: string,
  intentions: IntentionId[],
  count: number,
  signals: PersonalSignals = {}
): number[] {
  const blocked = new Set<number>(
    signals.pantangMode ? (signals.avoidNumbers ?? []) : []
  );
  const pool: number[] = [];
  const add = (n: number) => {
    if (n >= 1 && n <= 49 && !pool.includes(n) && !blocked.has(n)) pool.push(n);
  };

  // 1. Today's personal signal — placed first so it always lands when valid.
  if (signals.signalNumber) add(signals.signalNumber);

  // 2. Favourite number
  if (signals.favouriteNumber) add(signals.favouriteNumber);

  // 3. Birthdate numbers
  for (const n of birthdateNumbers(birthdate)) add(n);

  // 4. Name number
  add(nameToNumber(name));

  // 5. Zodiac seeds
  if (signals.zodiac) {
    for (const n of ZODIAC_SEEDS[signals.zodiac] ?? []) add(n);
  }

  // 6. Intention-seeded auspicious numbers
  for (const id of intentions) {
    for (const n of INTENTION_SEEDS[id] ?? []) {
      add(n);
    }
  }

  // 7. Fill remaining with a deterministic pseudo-random sequence seeded by profile
  const nameSeed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bdSeed = birthdate.replace(/\D/g, '').split('').reduce((a, d) => a + parseInt(d, 10), 0);
  let seed = ((nameSeed * 31 + bdSeed) * 1664525 + 1013904223) >>> 0;
  let guard = 0;
  while (pool.length < Math.min(count, 49 - blocked.size) && guard < 500) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    add((seed % 49) + 1);
    guard++;
  }

  return pool.slice(0, count);
}

/** Kept for backward-compatibility with any existing callers. */
export function deriveNumbers(input: string, numberType: string): number[] {
  const digits = input.replace(/\D/g, '');
  if (!digits) return [];
  const results: number[] = [];
  const add = (n: number) => {
    if (n >= 1 && n <= 49 && !results.includes(n)) results.push(n);
  };
  if (numberType === 'birthdate') {
    const dd = parseInt(digits.slice(0, 2), 10);
    const mm = parseInt(digits.slice(2, 4), 10);
    const yy = digits.length >= 8 ? parseInt(digits.slice(6, 8), 10) : 0;
    const sum = digits.split('').reduce((a, d) => a + parseInt(d, 10), 0);
    add(dd); add(mm); add(collapseToRange(sum)); add(yy);
  } else {
    for (let i = 0; i < digits.length - 1; i++) {
      add(parseInt(digits.slice(i, i + 2), 10));
    }
    add(collapseToRange(digits.split('').reduce((a, d) => a + parseInt(d, 10), 0)));
  }
  return results.slice(0, 6);
}

export function getNumberMeaning(n: number): string {
  return DIGIT_MEANING[n % 10] ?? '—';
}

export function hashNumbers(nums: number[]): string {
  let h = 2166136261 >>> 0;
  for (const n of nums) {
    h ^= n;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6).toUpperCase();
}

export function getAffirmation(nums: number[]): string {
  const idx = nums.reduce((a, n) => a + n, 0) % AFFIRMATIONS.length;
  return AFFIRMATIONS[idx];
}
