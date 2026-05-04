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

// ── Today's Almanac ─────────────────────────────────────────────────
// A daily cultural-reflection snapshot derived deterministically from the
// SGT date. Used by the Almanac screen and the home-screen almanac strip.
//
// Design intent: lift the visual structure from the prototype's
// "Today's Almanac" without any gambling framing — overall day energy,
// good/mindful activities, life-area reflections, good hours, lunar
// state. Anything tied to subjective claims (a specific direction,
// pantang etc.) reuses `getDailyExtras()` so both surfaces stay in sync.

export type AlmanacEnergy = 'bright' | 'steady' | 'gentle';
export type AlmanacDayType = 'open' | 'stable' | 'closed';
export type AlmanacTone = 'bright' | 'good' | 'steady' | 'gentle';
export type AlmanacLunar = 'waxing' | 'full' | 'waning' | 'new';

export interface AlmanacHour {
  rangeLabel: string; // e.g. "09:00 – 11:00"
  cn: string;         // e.g. "巳時"
  good: boolean;      // true = best/steady, false = mindful
  toneKey: 'best' | 'steady' | 'mindful';
}

export interface AlmanacLifeArea {
  id: 'wealth' | 'love' | 'health' | 'career';
  cn: string;
  value: number;          // 0–100, deterministic
  toneKey: AlmanacTone;
}

export interface DailyAlmanac {
  // Hero
  energy: AlmanacEnergy;
  energyScore: number;            // 0–100
  dayType: AlmanacDayType;
  // Fortune line — short Chinese phrase + the existing affirmation pool
  fortuneCn: string;
  fortuneEn: string;
  // Life-area meters — 4 deterministic values
  lifeAreas: AlmanacLifeArea[];
  // 3 good hours bands (1–2 best, 1 mindful)
  hours: AlmanacHour[];
  // Lunar
  lunar: AlmanacLunar;
  // Number of the day — single hero number with a one-line cultural reason
  heroNumber: number;
  heroNumberNote: string;
  // Colour of the day — name + hex; rotates over a 7-day cycle
  colour: { name: string; hex: string };
  // Element of the day (五行) — rotates daily
  element: { id: 'wood' | 'fire' | 'earth' | 'metal' | 'water'; cn: string; en: string };
  // Zodiac compatibility — one harmonious + one to be careful with
  harmonyZodiac: { animal: string; cn: string };
  carefulZodiac: { animal: string; cn: string };
}

const FORTUNE_LINES_CN = [
  '順 順 來，不 要 急',
  '心 安 即 是 福',
  '柳 暗 花 明 又 一 村',
  '靜 水 流 深',
  '一 步 一 蓮 花',
  '日 出 而 作',
  '福 至 心 靈',
];
const FORTUNE_LINES_EN = [
  '"Let things flow — don\'t rush."',
  '"A calm heart is itself a blessing."',
  '"Beyond the willows, another village blooms."',
  '"Still water runs deep."',
  '"Each step opens a flower."',
  '"Begin with the sunrise."',
  '"Blessing arrives when the heart is ready."',
];

// Colour rotation — culturally resonant SE Asian palette. Hex is meant for
// a small swatch chip, not as a guarantee of taste; users who care can
// always treat the suggestion as decorative.
const COLOURS = [
  { name: 'Imperial Gold',  hex: '#C9A24A' },
  { name: 'Cinnabar Red',   hex: '#C8362C' },
  { name: 'Jade Green',     hex: '#4A8C5C' },
  { name: 'Ivory',          hex: '#F5EEE1' },
  { name: 'Mulberry',       hex: '#6B2737' },
  { name: 'Ink Black',      hex: '#1B1410' },
  { name: 'Sky Blue',       hex: '#6FA3B5' },
];

// Five elements (五行) on a stable 5-day rotation.
const ELEMENTS: DailyAlmanac['element'][] = [
  { id: 'wood',  cn: '木', en: 'Wood'  },
  { id: 'fire',  cn: '火', en: 'Fire'  },
  { id: 'earth', cn: '土', en: 'Earth' },
  { id: 'metal', cn: '金', en: 'Metal' },
  { id: 'water', cn: '水', en: 'Water' },
];

const ZODIAC_LIST: { animal: string; cn: string }[] = [
  { animal: 'Rat',     cn: '鼠' },
  { animal: 'Ox',      cn: '牛' },
  { animal: 'Tiger',   cn: '虎' },
  { animal: 'Rabbit',  cn: '兔' },
  { animal: 'Dragon',  cn: '龍' },
  { animal: 'Snake',   cn: '蛇' },
  { animal: 'Horse',   cn: '馬' },
  { animal: 'Goat',    cn: '羊' },
  { animal: 'Monkey',  cn: '猴' },
  { animal: 'Rooster', cn: '雞' },
  { animal: 'Dog',     cn: '狗' },
  { animal: 'Pig',     cn: '豬' },
];

const HOUR_BANDS: { rangeLabel: string; cn: string }[] = [
  { rangeLabel: '07:00 – 09:00', cn: '辰時' },
  { rangeLabel: '09:00 – 11:00', cn: '巳時' },
  { rangeLabel: '11:00 – 13:00', cn: '午時' },
  { rangeLabel: '13:00 – 15:00', cn: '未時' },
  { rangeLabel: '15:00 – 17:00', cn: '申時' },
  { rangeLabel: '17:00 – 19:00', cn: '酉時' },
];

function sgtDateSeed(): number {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return parseInt(sgt.toISOString().split('T')[0].replace(/-/g, ''), 10);
}

function valueToTone(v: number): AlmanacTone {
  if (v >= 80) return 'bright';
  if (v >= 65) return 'good';
  if (v >= 50) return 'steady';
  return 'gentle';
}

/**
 * Compute today's almanac. Pure and deterministic per SGT date.
 */
export function getDailyAlmanac(): DailyAlmanac {
  const seed = sgtDateSeed();

  // Energy — score 50–95 in one of three buckets so the day never feels
  // "bad". Cultural reflection should never tell users they have a bad day.
  const eRaw = (seed * 9301 + 49297) % 45;
  const energyScore = 50 + eRaw;
  const energy: AlmanacEnergy =
    energyScore >= 80 ? 'bright' : energyScore >= 65 ? 'steady' : 'gentle';
  const dayType: AlmanacDayType =
    energy === 'bright' ? 'open' : energy === 'steady' ? 'stable' : 'closed';

  const f = (seed * 1597 + 7919) % FORTUNE_LINES_CN.length;
  const fortuneCn = FORTUNE_LINES_CN[f];
  const fortuneEn = FORTUNE_LINES_EN[f];

  // Life areas — 4 deterministic values, biased toward 50–90
  const areas: AlmanacLifeArea[] = [
    { id: 'wealth', cn: '財', value: 0, toneKey: 'steady' },
    { id: 'love',   cn: '愛', value: 0, toneKey: 'steady' },
    { id: 'health', cn: '安', value: 0, toneKey: 'steady' },
    { id: 'career', cn: '職', value: 0, toneKey: 'steady' },
  ];
  let s = (seed * 1664525 + 1013904223) >>> 0;
  for (const a of areas) {
    s = (s * 1664525 + 1013904223) >>> 0;
    a.value = 50 + (s % 45);
    a.toneKey = valueToTone(a.value);
  }

  // Hours — pick 2 "good" bands and 1 "mindful" band, no overlap
  const idxs: number[] = [];
  let h = (seed * 2654435761) >>> 0;
  while (idxs.length < 3) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const i = h % HOUR_BANDS.length;
    if (!idxs.includes(i)) idxs.push(i);
  }
  idxs.sort((a, b) => a - b);
  const hours: AlmanacHour[] = idxs.map((i, k) => {
    const isMindful = k === 2;
    return {
      rangeLabel: HOUR_BANDS[i].rangeLabel,
      cn: HOUR_BANDS[i].cn,
      good: !isMindful,
      toneKey: k === 0 ? 'best' : k === 1 ? 'steady' : 'mindful',
    };
  });

  // Lunar — 4-bucket cycle keyed off the day-of-month (rough but stable)
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const dom = sgt.getUTCDate();
  const lunar: AlmanacLunar =
    dom <= 7  ? 'new' :
    dom <= 14 ? 'waxing' :
    dom <= 21 ? 'full' : 'waning';

  // Hero number for the day — pull from the curated DAILY_AUSPICIOUS_POOL so
  // the number always reads as culturally meaningful, not random.
  const heroIdx = ((seed * 8191) >>> 0) % DAILY_AUSPICIOUS_POOL.length;
  const heroNumber = DAILY_AUSPICIOUS_POOL[heroIdx];
  const heroNumberNote =
    CULTURAL_NUMBER_NOTES[heroNumber] ?? getNumberMeaning(heroNumber);

  const colour = COLOURS[((seed * 6151) >>> 0) % COLOURS.length];
  const element = ELEMENTS[((seed * 4099) >>> 0) % ELEMENTS.length];

  // Zodiac compat — pick two distinct animals deterministically. The two are
  // intended to complement, not contradict, the user's own zodiac (which is
  // surfaced separately on the analysis screen).
  const harmonyIdx = ((seed * 2089) >>> 0) % ZODIAC_LIST.length;
  let carefulIdx = ((seed * 5237 + 7) >>> 0) % ZODIAC_LIST.length;
  if (carefulIdx === harmonyIdx) carefulIdx = (carefulIdx + 6) % ZODIAC_LIST.length;
  const harmonyZodiac = ZODIAC_LIST[harmonyIdx];
  const carefulZodiac = ZODIAC_LIST[carefulIdx];

  return {
    energy, energyScore, dayType,
    fortuneCn, fortuneEn,
    lifeAreas: areas,
    hours,
    lunar,
    heroNumber, heroNumberNote,
    colour, element,
    harmonyZodiac, carefulZodiac,
  };
}

// ─── 5 daily auspicious systems ──────────────────────────────────
// These are deterministic per SGT date so two users on the same day see
// the same picks (important for cultural credibility) but may also be
// re-personalised by the AI rewrite layer when a Groq key is available.

// 1. Kau Cim — Daily Fortune Stick. 100 sticks, mapped to a fortune line +
//    a luck rating. The fortune lines are short, kind, culturally rooted.
const KAU_CIM_FORTUNES: { tier: 'great' | 'good' | 'middle' | 'gentle'; en: string; cn: string }[] = [
  { tier: 'great',  en: 'A door long closed begins to open.', cn: '柳暗花明' },
  { tier: 'great',  en: 'Patience brings the reward you seek.', cn: '苦盡甘來' },
  { tier: 'great',  en: 'The harvest is sweet — gather quietly.', cn: '五穀豐登' },
  { tier: 'good',   en: 'A small step today leads to a steady gain.', cn: '步步高升' },
  { tier: 'good',   en: 'Help arrives from a familiar face.', cn: '貴人扶助' },
  { tier: 'good',   en: 'Tend what you have; abundance follows.', cn: '富貴有道' },
  { tier: 'middle', en: 'Hold your peace — clarity is on the way.', cn: '心靜自安' },
  { tier: 'middle', en: 'Listen more than you speak today.', cn: '言多必失' },
  { tier: 'middle', en: 'A neutral day — make no large decisions.', cn: '平常如意' },
  { tier: 'gentle', en: 'Walk softly past arguments today.', cn: '退一步海闊' },
  { tier: 'gentle', en: 'Rest is also a kind of work.', cn: '靜以修身' },
  { tier: 'gentle', en: 'Save your effort for tomorrow.', cn: '養精蓄銳' },
];

const TIER_RATING: Record<string, number> = {
  great: 9.0, good: 7.5, middle: 6.5, gentle: 5.5,
};

export interface KauCim {
  stickNumber: number;     // 1–100
  tier: 'great' | 'good' | 'middle' | 'gentle';
  fortuneEn: string;
  fortuneCn: string;
  rating: number;          // 0–10, derived from tier with a small jitter
}

export function getKauCim(): KauCim {
  const seed = sgtDateSeed();
  const stickNumber = (((seed * 6271) >>> 0) % 100) + 1;
  const f = KAU_CIM_FORTUNES[((seed * 8273) >>> 0) % KAU_CIM_FORTUNES.length];
  const jitter = (((seed * 4567) >>> 0) % 5) / 10; // 0.0 – 0.4
  const rating = Math.min(9.9, Math.max(4.5, TIER_RATING[f.tier] + jitter));
  return {
    stickNumber, tier: f.tier,
    fortuneEn: f.en, fortuneCn: f.cn,
    rating: Math.round(rating * 10) / 10,
  };
}

// 2. Chinese Zodiac — Daily Animal Luck.
//    Computes a compatibility score for the user's birth-year animal
//    against the day animal, plus 3 colours and 3 numbers.
const ZODIAC_BASE_YEAR = 1900; // 1900 = Rat (Year of the Metal Rat)
const ZODIAC_ORDER: ZodiacAnimal[] = [
  'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake',
  'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
];
type ZodiacAnimal =
  | 'Rat' | 'Ox' | 'Tiger' | 'Rabbit' | 'Dragon' | 'Snake'
  | 'Horse' | 'Goat' | 'Monkey' | 'Rooster' | 'Dog' | 'Pig';

export function zodiacFromYear(year: number): ZodiacAnimal {
  const idx = ((year - ZODIAC_BASE_YEAR) % 12 + 12) % 12;
  return ZODIAC_ORDER[idx];
}

// Compatibility table — rough cultural sketch; trine groups ≈ harmonious,
// opposite (6 apart) ≈ clashing. Not a definitive BaZi compat.
const TRINE_GROUPS: ZodiacAnimal[][] = [
  ['Rat', 'Dragon', 'Monkey'],
  ['Ox', 'Snake', 'Rooster'],
  ['Tiger', 'Horse', 'Dog'],
  ['Rabbit', 'Goat', 'Pig'],
];

export interface ZodiacToday {
  userAnimal: ZodiacAnimal;
  dayAnimal: ZodiacAnimal;
  score: number;       // 0–10
  rapport: 'harmonious' | 'neutral' | 'clashing';
  colours: string[];   // 3 colour names
  numbers: number[];   // 3 numbers 1–49
}

export function getZodiacToday(birthYear?: number): ZodiacToday {
  const seed = sgtDateSeed();
  const dayAnimal = ZODIAC_ORDER[((seed * 6997) >>> 0) % 12];
  const userAnimal: ZodiacAnimal = birthYear
    ? zodiacFromYear(birthYear)
    : ZODIAC_ORDER[((seed * 1117) >>> 0) % 12];

  // Score: same trine = harmonious (8.5), opposite (6 apart) = clashing (4.5),
  // else neutral (6.5)
  const sameTrine = TRINE_GROUPS.some(g =>
    g.includes(userAnimal) && g.includes(dayAnimal)
  );
  const userIdx = ZODIAC_ORDER.indexOf(userAnimal);
  const dayIdx = ZODIAC_ORDER.indexOf(dayAnimal);
  const distance = Math.min(
    (userIdx - dayIdx + 12) % 12,
    (dayIdx - userIdx + 12) % 12,
  );
  const isOpposite = distance === 6;
  const rapport: ZodiacToday['rapport'] = sameTrine ? 'harmonious' : isOpposite ? 'clashing' : 'neutral';
  const baseScore = sameTrine ? 8.5 : isOpposite ? 4.5 : 6.5;
  const jitter = (((seed * 9907) >>> 0) % 8) / 10;
  const score = Math.round((baseScore + jitter) * 10) / 10;

  // Colours — 3 from the 7-colour palette
  const colourPool = [
    'Imperial Gold', 'Cinnabar Red', 'Jade Green', 'Ivory',
    'Mulberry', 'Ink Black', 'Sky Blue',
  ];
  const colours: string[] = [];
  let s = seed;
  while (colours.length < 3) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const c = colourPool[s % colourPool.length];
    if (!colours.includes(c)) colours.push(c);
  }

  // Numbers — 3 from the auspicious pool
  const numbers: number[] = [];
  let s2 = (seed * 7919) >>> 0;
  while (numbers.length < 3) {
    s2 = (s2 * 1664525 + 1013904223) >>> 0;
    const n = DAILY_AUSPICIOUS_POOL[s2 % DAILY_AUSPICIOUS_POOL.length];
    if (!numbers.includes(n)) numbers.push(n);
  }

  return { userAnimal, dayAnimal, score, rapport, colours, numbers };
}

// 6. BaZi Lite — Element Balance. Simplified to user-element vs day-element
//    relation (generative cycle, supportive cycle, controlling cycle).
const ELEMENT_ORDER: DailyAlmanac['element']['id'][] = ['wood', 'fire', 'earth', 'metal', 'water'];
type ElementId = DailyAlmanac['element']['id'];

// Generative cycle (生): wood → fire → earth → metal → water → wood
function elementGenerates(a: ElementId, b: ElementId): boolean {
  const i = ELEMENT_ORDER.indexOf(a);
  return ELEMENT_ORDER[(i + 1) % 5] === b;
}
// Controlling cycle (剋): wood → earth → water → fire → metal → wood
function elementControls(a: ElementId, b: ElementId): boolean {
  const i = ELEMENT_ORDER.indexOf(a);
  return ELEMENT_ORDER[(i + 2) % 5] === b;
}

export interface BaZiLite {
  userElement: ElementId;
  userElementCn: string;
  dayElement: ElementId;
  dayElementCn: string;
  relation: 'supports' | 'is supported' | 'restrains' | 'is restrained' | 'aligned';
  outlook: 'growth' | 'support' | 'caution' | 'steady';
  message: string;
}

const ELEMENT_CN: Record<ElementId, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
};

export function getBaZiLite(birthYear?: number): BaZiLite {
  const seed = sgtDateSeed();
  // User element — reduce birth year to one of 5; if absent, derive from seed.
  const userElement: ElementId = birthYear
    ? ELEMENT_ORDER[(((Math.floor(birthYear / 2)) % 5) + 5) % 5]
    : ELEMENT_ORDER[((seed * 233) >>> 0) % 5];
  const dayElement: ElementId = ELEMENT_ORDER[((seed * 4099) >>> 0) % 5];

  let relation: BaZiLite['relation'];
  let outlook: BaZiLite['outlook'];
  let message: string;

  if (userElement === dayElement) {
    relation = 'aligned';
    outlook = 'steady';
    message = 'A steady, in-tune day. Trust your usual rhythm.';
  } else if (elementGenerates(userElement, dayElement)) {
    relation = 'supports';
    outlook = 'support';
    message = 'You give energy out today — kind acts return to you.';
  } else if (elementGenerates(dayElement, userElement)) {
    relation = 'is supported';
    outlook = 'growth';
    message = 'Today supports your growth. Begin small things.';
  } else if (elementControls(userElement, dayElement)) {
    relation = 'restrains';
    outlook = 'steady';
    message = 'You can shape today — keep your hand light.';
  } else {
    relation = 'is restrained';
    outlook = 'caution';
    message = 'Be cautious — slow down before big moves.';
  }

  return {
    userElement, userElementCn: ELEMENT_CN[userElement],
    dayElement, dayElementCn: ELEMENT_CN[dayElement],
    relation, outlook, message,
  };
}

// 7. I Ching — Hexagram of the Day. 64 hexagrams, each with a short
//    meaning and one-line decision advice. Curated subset for prototyping.
const HEXAGRAMS: {
  num: number; name: string; cn: string; meaning: string; advice: string;
}[] = [
  { num: 1,  name: 'The Creative',     cn: '乾', meaning: 'Bold beginning.',          advice: 'Begin what you have planned.' },
  { num: 2,  name: 'The Receptive',    cn: '坤', meaning: 'Yielding strength.',       advice: 'Receive help today.' },
  { num: 11, name: 'Peace',            cn: '泰', meaning: 'Heaven and earth meet.',   advice: 'A good day to mend bridges.' },
  { num: 14, name: 'Great Possession', cn: '大有', meaning: 'Abundance gathers.',     advice: 'Hold what you have well.' },
  { num: 16, name: 'Enthusiasm',       cn: '豫', meaning: 'Joyful momentum.',         advice: 'Move now — but stay kind.' },
  { num: 22, name: 'Grace',            cn: '賁', meaning: 'Beauty in form.',          advice: 'Care for your appearance.' },
  { num: 24, name: 'Return',           cn: '復', meaning: 'A turning point.',         advice: 'Return to your old habit of care.' },
  { num: 32, name: 'Duration',         cn: '恆', meaning: 'Lasting steadiness.',      advice: 'Keep at the small thing.' },
  { num: 42, name: 'Increase',         cn: '益', meaning: 'Gain through giving.',     advice: 'Give a little — gain a lot.' },
  { num: 50, name: 'The Cauldron',     cn: '鼎', meaning: 'Nourishment.',             advice: 'Cook a slow meal today.' },
  { num: 55, name: 'Abundance',        cn: '豐', meaning: 'Sun at noon.',             advice: 'Make hay while the sun shines.' },
  { num: 63, name: 'After Completion', cn: '既濟', meaning: 'Order has arrived.',     advice: 'Stay alert — keep things tidy.' },
];

export interface IChingDaily {
  num: number;
  name: string;
  cn: string;
  meaning: string;
  advice: string;
}

export function getIChingHexagram(): IChingDaily {
  const seed = sgtDateSeed();
  return HEXAGRAMS[((seed * 3187) >>> 0) % HEXAGRAMS.length];
}

// 8. Tong Shu — Do & Don't Today. Short cultural-almanac-style suggestions.
export interface TongShuDaily {
  goodFor: string[];   // 3–4 items
  avoid: string[];     // 3 items
}

const TONG_SHU_GOOD_POOL = [
  'Family meals', 'Visiting elders', 'Tidying', 'Quiet planning',
  'Returning small favours', 'Walking outdoors', 'Praying / lighting incense',
  'Calling an old friend', 'Reading',
];
const TONG_SHU_AVOID_POOL = [
  'Big purchases', 'Lending money', 'Long arguments',
  'Travelling far', 'Starting a court matter', 'Cutting hair',
  'Major moves', 'Unfamiliar food',
];

export function getTongShu(): TongShuDaily {
  const seed = sgtDateSeed();
  const pickN = (pool: string[], count: number, salt: number): string[] => {
    const out: string[] = [];
    let s = (seed * salt + 7919) >>> 0;
    while (out.length < count) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const item = pool[s % pool.length];
      if (!out.includes(item)) out.push(item);
    }
    return out;
  };
  return {
    goodFor: pickN(TONG_SHU_GOOD_POOL, 4, 311),
    avoid:   pickN(TONG_SHU_AVOID_POOL, 3, 547),
  };
}

// ─── Combined "Your Luck Today" summary + lucky-number generators ────
// Aggregates the 5 systems into a single 0–10 score and produces 4D / TOTO
// format suggestions. **For entertainment only — not a prediction.**

export interface LuckyNumbers {
  fourD: string[];     // 2 strings of 4 digits each, e.g. "1837"
  toto: number[];      // 6 numbers, 1–49, sorted
}

export function getDailyLuckyNumbers(): LuckyNumbers {
  const seed = sgtDateSeed();
  // 4D — two distinct 4-digit strings derived from the seed.
  const make4D = (salt: number): string => {
    let s = ((seed * salt) >>> 0);
    let str = '';
    for (let i = 0; i < 4; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      str += (s % 10).toString();
    }
    return str;
  };
  const fourD = [make4D(2741), make4D(8629)];
  if (fourD[0] === fourD[1]) fourD[1] = make4D(8631);

  // TOTO — 6 distinct numbers from 1–49, biased toward auspicious pool.
  const toto = new Set<number>();
  let s = (seed * 5471) >>> 0;
  // Seed with 3 from the auspicious pool first
  for (let i = 0; i < 3 && toto.size < 6; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    toto.add(DAILY_AUSPICIOUS_POOL[s % DAILY_AUSPICIOUS_POOL.length]);
  }
  while (toto.size < 6) {
    s = (s * 1664525 + 1013904223) >>> 0;
    toto.add((s % 49) + 1);
  }
  return {
    fourD,
    toto: [...toto].sort((a, b) => a - b),
  };
}

export interface LuckSummary {
  score: number;        // 0–10, blended from the 5 systems
  oneLine: string;      // short user-facing summary
}

export function getLuckSummary(args: {
  kauCim: KauCim;
  zodiac: ZodiacToday;
  bazi: BaZiLite;
  almanac: DailyAlmanac;
}): LuckSummary {
  // Blend: Kau Cim 30%, Zodiac compat 30%, BaZi outlook 20%, day energy 20%
  const baziScore =
    args.bazi.outlook === 'growth' ? 9 :
    args.bazi.outlook === 'support' ? 7.5 :
    args.bazi.outlook === 'steady' ? 6.5 : 5;
  const dayScore = args.almanac.energyScore / 10; // 0–10
  const blended =
    args.kauCim.rating * 0.30 +
    args.zodiac.score   * 0.30 +
    baziScore           * 0.20 +
    dayScore            * 0.20;
  const score = Math.round(blended * 10) / 10;

  let oneLine: string;
  if (score >= 8) {
    oneLine = 'A bright day. Take one small bold step.';
  } else if (score >= 6.5) {
    oneLine = 'A steady, friendly day. Keep your usual pace.';
  } else if (score >= 5) {
    oneLine = 'A balanced day. Listen more, decide less.';
  } else {
    oneLine = 'A gentle day. Rest, and tomorrow turns lighter.';
  }
  return { score, oneLine };
}
