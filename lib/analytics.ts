// Lightweight local analytics. AsyncStorage-backed; no network calls, no PII.
//
// Why local: we ship to the App Store as a paid entertainment app for adults
// 55–80. Sending behavior to a third party would force an extra privacy review
// and a new disclosure on the disclaimer screen. Local-only is a smaller blast
// radius that still answers the question we actually need to answer pre-launch:
// "are users tapping the things we built?"
//
// Swap path: when the team is ready to ship to Mixpanel/Amplitude/Firebase,
// keep the public API (track, markAppOpen, getRetentionStats) and replace the
// in-file storage backend. The call sites do not need to change.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_EVENTS = '@blessed_numbers:analytics_events';
const KEY_META   = '@blessed_numbers:analytics_meta';
const MAX_EVENTS = 200;

export type AnalyticsEventName =
  | 'app_open'
  | 'onboarding_completed'
  | 'onboarding_personalise_completed'
  | 'onboarding_personalise_skipped'
  | 'first_reading_started'
  | 'first_reading_revealed'
  | 'first_reading_skipped'
  | 'home_visit'
  | 'why_these_numbers_tapped'
  | 'locked_item_tapped'
  | 'reading_revealed'
  | 'signal_set'
  | 'streak_milestone'
  | 'premium_preview_unlocked'
  | 'paywall_reached'
  | 'paywall_converted'
  | 'paywall_dismissed'
  | 'almanac_visit'
  | 'almanac_strip_tapped'
  | 'spin_started'
  | 'spin_landed'
  | 'reading_saved';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  ts: number; // ms since epoch
  props?: Record<string, string | number | boolean>;
}

export interface AnalyticsMeta {
  firstOpenAt: number | null;
  lastOpenAt: number | null;
  sessionCount: number;
  paywallReached: number;
  paywallConverted: number;
  // Day-N return flags. Stamped once the user's app_open lands inside that
  // window. We compute "day N" relative to firstOpenAt in 24-hour blocks.
  day1Returned: boolean;
  day7Returned: boolean;
}

export interface RetentionStats extends AnalyticsMeta {
  daysSinceFirstOpen: number;
  whyTappedCount: number;
  lockedTappedCount: number;
  readingsRevealed: number;
  paywallConversionRate: number; // 0..1, undefined when no paywall reach
}

// ─────────────────────────────────────────────────────────
// Pluggable storage so tests can run under plain Node.
// ─────────────────────────────────────────────────────────
export interface AnalyticsStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const asyncStorageBackend: AnalyticsStorage = {
  get: (k) => AsyncStorage.getItem(k),
  set: (k, v) => AsyncStorage.setItem(k, v),
  remove: (k) => AsyncStorage.removeItem(k),
};

const DEFAULT_META: AnalyticsMeta = {
  firstOpenAt: null,
  lastOpenAt: null,
  sessionCount: 0,
  paywallReached: 0,
  paywallConverted: 0,
  day1Returned: false,
  day7Returned: false,
};

// ─────────────────────────────────────────────────────────
// Pure helpers — exported for testability.
// ─────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(earlier: number, later: number): number {
  if (later < earlier) return 0;
  return Math.floor((later - earlier) / DAY_MS);
}

export function applyAppOpen(meta: AnalyticsMeta, now: number): AnalyticsMeta {
  const firstOpenAt = meta.firstOpenAt ?? now;
  const sessionCount = meta.sessionCount + 1;

  // A "day-1 return" means the user came back at least 24h after first open
  // but before 48h have elapsed. Day-7 means at least 7 days later.
  const elapsed = now - firstOpenAt;
  const day1Returned = meta.day1Returned || (elapsed >= DAY_MS && elapsed < 7 * DAY_MS);
  const day7Returned = meta.day7Returned || elapsed >= 7 * DAY_MS;

  return {
    ...meta,
    firstOpenAt,
    lastOpenAt: now,
    sessionCount,
    day1Returned,
    day7Returned,
  };
}

export function deriveStats(
  meta: AnalyticsMeta,
  events: AnalyticsEvent[],
  now: number
): RetentionStats {
  const whyTappedCount      = events.filter(e => e.name === 'why_these_numbers_tapped').length;
  const lockedTappedCount   = events.filter(e => e.name === 'locked_item_tapped').length;
  const readingsRevealed    = events.filter(e => e.name === 'reading_revealed').length;
  const daysSinceFirstOpen  = meta.firstOpenAt ? daysBetween(meta.firstOpenAt, now) : 0;
  const paywallConversionRate =
    meta.paywallReached > 0 ? meta.paywallConverted / meta.paywallReached : 0;

  return {
    ...meta,
    daysSinceFirstOpen,
    whyTappedCount,
    lockedTappedCount,
    readingsRevealed,
    paywallConversionRate,
  };
}

// ─────────────────────────────────────────────────────────
// Storage-backed core. Returned by createAnalytics so tests can
// inject an in-memory backend.
// ─────────────────────────────────────────────────────────
export interface Analytics {
  track(name: AnalyticsEventName, props?: AnalyticsEvent['props']): Promise<void>;
  markAppOpen(): Promise<AnalyticsMeta>;
  getEvents(): Promise<AnalyticsEvent[]>;
  getMeta(): Promise<AnalyticsMeta>;
  getRetentionStats(): Promise<RetentionStats>;
  reset(): Promise<void>;
}

export function createAnalytics(
  storage: AnalyticsStorage = asyncStorageBackend,
  clock: () => number = () => Date.now()
): Analytics {
  async function readMeta(): Promise<AnalyticsMeta> {
    const raw = await storage.get(KEY_META);
    if (!raw) return { ...DEFAULT_META };
    try {
      return { ...DEFAULT_META, ...(JSON.parse(raw) as Partial<AnalyticsMeta>) };
    } catch {
      return { ...DEFAULT_META };
    }
  }

  async function writeMeta(meta: AnalyticsMeta): Promise<void> {
    await storage.set(KEY_META, JSON.stringify(meta));
  }

  async function readEvents(): Promise<AnalyticsEvent[]> {
    const raw = await storage.get(KEY_EVENTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as AnalyticsEvent[];
    } catch {
      return [];
    }
  }

  async function writeEvents(events: AnalyticsEvent[]): Promise<void> {
    await storage.set(KEY_EVENTS, JSON.stringify(events));
  }

  async function track(
    name: AnalyticsEventName,
    props?: AnalyticsEvent['props']
  ): Promise<void> {
    const events = await readEvents();
    const next = [...events, { name, ts: clock(), props }].slice(-MAX_EVENTS);
    await writeEvents(next);

    if (name === 'paywall_reached' || name === 'paywall_converted') {
      const meta = await readMeta();
      await writeMeta({
        ...meta,
        paywallReached: meta.paywallReached + (name === 'paywall_reached' ? 1 : 0),
        paywallConverted: meta.paywallConverted + (name === 'paywall_converted' ? 1 : 0),
      });
    }
  }

  async function markAppOpen(): Promise<AnalyticsMeta> {
    const now = clock();
    const meta = await readMeta();
    const next = applyAppOpen(meta, now);
    await writeMeta(next);
    // Also append an event so the timeline shows session boundaries.
    await track('app_open');
    return next;
  }

  async function getEvents() { return readEvents(); }
  async function getMeta() { return readMeta(); }

  async function getRetentionStats(): Promise<RetentionStats> {
    const meta = await readMeta();
    const events = await readEvents();
    return deriveStats(meta, events, clock());
  }

  async function reset(): Promise<void> {
    await storage.remove(KEY_EVENTS);
    await storage.remove(KEY_META);
  }

  return { track, markAppOpen, getEvents, getMeta, getRetentionStats, reset };
}

// Default singleton used throughout the app.
export const analytics = createAnalytics();

// Convenience wrapper that swallows errors — analytics must never crash the UI.
export function track(
  name: AnalyticsEventName,
  props?: AnalyticsEvent['props']
): void {
  void analytics.track(name, props).catch(err => {
    console.warn('[analytics] track failed', name, err);
  });
}
