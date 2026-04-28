import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Reading {
  id: string;
  numberInput: string;
  numberType: string;
  content: string;
  createdAt: string;
  numbers?: number[];
  intentions?: string[];
}

export const ZODIAC_ANIMALS = [
  'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake',
  'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
] as const;
export type ZodiacAnimal = (typeof ZODIAC_ANIMALS)[number];

export interface OnboardingSignal {
  // Free-form short reflection captured on the personalise step. Always
  // passes through lib/filter.ts before saving — the screen does the check.
  text?: string;
  capturedAt?: string;
}

export interface UserProfile {
  name: string;
  birthdate: string; // YYYY-MM-DD
  zodiac?: ZodiacAnimal;
  favouriteNumber?: number;
  pantangMode?: boolean;
  avoidNumbers?: number[];
  onboardingSignal?: OnboardingSignal;
}

export type TextSizePreference = 'standard' | 'large' | 'xlarge';

const KEYS = {
  READINGS: '@blessed_numbers:history',
  ONBOARDING: '@blessed_numbers:onboarding_complete',
  TEXT_SIZE: '@blessed_numbers:text_size',
  PROFILE: '@blessed_numbers:profile',
  DRAW_RECORD: '@blessed_numbers:draw_record',
  PREMIUM: '@blessed_numbers:premium',
  DAILY_INSIGHT: '@blessed_numbers:daily_insight',
  TODAY_READING: '@blessed_numbers:today_reading',
  TODAY_ANALYSIS: '@blessed_numbers:today_analysis',
  TODAY_SIGNAL: '@blessed_numbers:today_signal',
  STREAK: '@blessed_numbers:streak',
  PREMIUM_PREVIEW: '@blessed_numbers:premium_preview',
};

const MAX_READINGS = 50;
export const FREE_DRAWS_PER_DAY = 1;

// Readings

export async function saveReading(reading: Reading): Promise<void> {
  const existing = await getReadings();
  const updated = [reading, ...existing].slice(0, MAX_READINGS);
  await AsyncStorage.setItem(KEYS.READINGS, JSON.stringify(updated));
}

export async function getReadings(): Promise<Reading[]> {
  const raw = await AsyncStorage.getItem(KEYS.READINGS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Reading[];
  } catch {
    return [];
  }
}

export async function deleteReading(id: string): Promise<void> {
  const existing = await getReadings();
  const updated = existing.filter((r) => r.id !== id);
  await AsyncStorage.setItem(KEYS.READINGS, JSON.stringify(updated));
}

// Onboarding

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDING);
  return val === 'true';
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING, 'true');
}

// User profile

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

// Merge new fields onto the existing profile without clobbering required ones.
export async function updateProfile(patch: Partial<UserProfile>): Promise<UserProfile | null> {
  const existing = await getProfile();
  if (!existing) return null;
  const next: UserProfile = { ...existing, ...patch };
  await saveProfile(next);
  return next;
}

// Daily draw tracking

interface DrawRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

function todayString(): string {
  // SGT = UTC+8; reset follows Singapore midnight, not UTC midnight
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return sgt.toISOString().split('T')[0];
}

export async function getTodayDrawCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.DRAW_RECORD);
  if (!raw) return 0;
  try {
    const record: DrawRecord = JSON.parse(raw);
    return record.date === todayString() ? record.count : 0;
  } catch {
    return 0;
  }
}

export async function incrementTodayDrawCount(): Promise<void> {
  const count = await getTodayDrawCount();
  await AsyncStorage.setItem(
    KEYS.DRAW_RECORD,
    JSON.stringify({ date: todayString(), count: count + 1 })
  );
}

// Premium / subscription

export async function isPremium(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.PREMIUM);
  return val === 'true';
}

export async function setPremium(val: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.PREMIUM, val ? 'true' : 'false');
}

// Text size preference

export async function getTextSize(): Promise<TextSizePreference> {
  const val = await AsyncStorage.getItem(KEYS.TEXT_SIZE);
  if (val === 'large' || val === 'xlarge') return val;
  return 'standard';
}

export async function saveTextSize(size: TextSizePreference): Promise<void> {
  await AsyncStorage.setItem(KEYS.TEXT_SIZE, size);
}

// Daily AI insight cache

interface DailyInsightRecord {
  date: string;
  content: string;
}

export async function getDailyInsightCache(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_INSIGHT);
  if (!raw) return null;
  try {
    const record: DailyInsightRecord = JSON.parse(raw);
    return record.date === todayString() ? record.content : null;
  } catch {
    return null;
  }
}

export async function saveDailyInsightCache(content: string): Promise<void> {
  await AsyncStorage.setItem(
    KEYS.DAILY_INSIGHT,
    JSON.stringify({ date: todayString(), content })
  );
}

// Today's locked-in reading — set when the user reveals, cleared at SGT midnight

export interface TodayReading {
  date: string; // YYYY-MM-DD (SGT)
  numbers: number[];
  intentions: string[];
  revealedAt: string; // ISO timestamp
}

export async function getTodayReading(): Promise<TodayReading | null> {
  const raw = await AsyncStorage.getItem(KEYS.TODAY_READING);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as TodayReading;
    return record.date === todayString() ? record : null;
  } catch {
    return null;
  }
}

export async function saveTodayReading(
  numbers: number[],
  intentions: string[]
): Promise<void> {
  const record: TodayReading = {
    date: todayString(),
    numbers,
    intentions,
    revealedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.TODAY_READING, JSON.stringify(record));
}

export async function clearTodayReading(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.TODAY_READING);
}

// Today's AI analysis cache — keyed by today's numbers so it survives navigation

interface TodayAnalysisRecord {
  date: string;
  numbersKey: string;
  content: string;
}

export async function getTodayAnalysisCache(numbers: number[]): Promise<string | null> {
  const raw = await AsyncStorage.getItem(KEYS.TODAY_ANALYSIS);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as TodayAnalysisRecord;
    const key = numbers.join(',');
    return record.date === todayString() && record.numbersKey === key
      ? record.content
      : null;
  } catch {
    return null;
  }
}

export async function saveTodayAnalysisCache(
  numbers: number[],
  content: string
): Promise<void> {
  const record: TodayAnalysisRecord = {
    date: todayString(),
    numbersKey: numbers.join(','),
    content,
  };
  await AsyncStorage.setItem(KEYS.TODAY_ANALYSIS, JSON.stringify(record));
}

// Today's personal-signal number — a single 1–49 the user notices today.
// Cleared automatically when SGT date rolls over.

interface TodaySignalRecord {
  date: string;
  number: number;
}

export async function getTodaySignalNumber(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEYS.TODAY_SIGNAL);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as TodaySignalRecord;
    return r.date === todayString() ? r.number : null;
  } catch {
    return null;
  }
}

export async function setTodaySignalNumber(n: number): Promise<void> {
  if (!Number.isInteger(n) || n < 1 || n > 49) return;
  const record: TodaySignalRecord = { date: todayString(), number: n };
  await AsyncStorage.setItem(KEYS.TODAY_SIGNAL, JSON.stringify(record));
}

export async function clearTodaySignalNumber(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.TODAY_SIGNAL);
}

// Streak — counts consecutive SGT days the app has been opened.
// Same-day open is a no-op. Gap > 1 SGT day resets to 1. Updated by
// applyDailyState() at app start.

export interface StreakState {
  streakCount: number;
  lastOpenedDate: string; // YYYY-MM-DD (SGT)
  longest: number;
}

const DEFAULT_STREAK: StreakState = {
  streakCount: 0,
  lastOpenedDate: '',
  longest: 0,
};

export async function getStreakState(): Promise<StreakState> {
  const raw = await AsyncStorage.getItem(KEYS.STREAK);
  if (!raw) return { ...DEFAULT_STREAK };
  try {
    return { ...DEFAULT_STREAK, ...(JSON.parse(raw) as Partial<StreakState>) };
  } catch {
    return { ...DEFAULT_STREAK };
  }
}

async function writeStreakState(s: StreakState): Promise<void> {
  await AsyncStorage.setItem(KEYS.STREAK, JSON.stringify(s));
}

// Pure helper, exported for testability.
export function nextStreak(prev: StreakState, todaySgt: string): StreakState {
  if (prev.lastOpenedDate === todaySgt) return prev;
  if (!prev.lastOpenedDate) {
    const v = { streakCount: 1, lastOpenedDate: todaySgt, longest: 1 };
    return v;
  }
  const prevDay = new Date(prev.lastOpenedDate + 'T00:00:00Z').getTime();
  const todayDay = new Date(todaySgt + 'T00:00:00Z').getTime();
  const gapDays = Math.round((todayDay - prevDay) / (24 * 60 * 60 * 1000));
  const streakCount = gapDays === 1 ? prev.streakCount + 1 : 1;
  const longest = Math.max(prev.longest, streakCount);
  return { streakCount, lastOpenedDate: todaySgt, longest };
}

// One-shot premium preview unlock. Set when the user crosses a streak
// milestone; cleared when consumed (e.g. user closes the unlocked card or
// the SGT day rolls over). We store the date it was earned so it survives
// across the same SGT day even after a fresh launch.

interface PremiumPreviewRecord {
  unlockedOn: string; // YYYY-MM-DD (SGT) — the day the unlock applies
}

export async function isPremiumPreviewUnlocked(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.PREMIUM_PREVIEW);
  if (!raw) return false;
  try {
    const r = JSON.parse(raw) as PremiumPreviewRecord;
    return r.unlockedOn === todayString();
  } catch {
    return false;
  }
}

export async function unlockPremiumPreview(): Promise<void> {
  const record: PremiumPreviewRecord = { unlockedOn: todayString() };
  await AsyncStorage.setItem(KEYS.PREMIUM_PREVIEW, JSON.stringify(record));
}

export async function clearPremiumPreview(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.PREMIUM_PREVIEW);
}

// Streak milestone at which a free user gets one day of premium-preview
// access to the locked daily-extras (direction + numbers to step around).
export const STREAK_PREVIEW_MILESTONE = 3;

// Single entry point called once per app launch (see app/_layout.tsx).
// Updates the streak and unlocks the premium preview if a milestone is hit.
// todaySignalNumber is keyed by date so it self-resets — no work needed here.
export async function applyDailyState(): Promise<{
  streak: StreakState;
  previewUnlockedNow: boolean;
}> {
  const today = todayString();
  const prev = await getStreakState();
  const streak = nextStreak(prev, today);
  let previewUnlockedNow = false;
  if (streak !== prev) {
    await writeStreakState(streak);
    if (
      streak.streakCount >= STREAK_PREVIEW_MILESTONE &&
      streak.streakCount > prev.streakCount
    ) {
      await unlockPremiumPreview();
      previewUnlockedNow = true;
    }
  }
  return { streak, previewUnlockedNow };
}
