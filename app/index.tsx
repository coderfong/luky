import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView,
  Animated, Easing, TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { NumberBall } from '../components/NumberBall';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Colors, Spacing, Radius, Shadow } from '../constants/theme';
import { Strings } from '../constants/strings';
import {
  INTENTIONS, IntentionId, deriveFromProfile,
  getDailyFeaturedNumbers, getDailyExtras, getNumberMeaning,
  CULTURAL_NUMBER_NOTES, getDailyAlmanac,
} from '../lib/numbers';
import {
  isOnboardingComplete, getProfile, UserProfile,
  getTodayDrawCount, isPremium, FREE_DRAWS_PER_DAY,
  getDailyInsightCache, saveDailyInsightCache,
  getTodayReading,
  getTodaySignalNumber, setTodaySignalNumber,
  getStreakState, isPremiumPreviewUnlocked,
  STREAK_PREVIEW_MILESTONE,
} from '../lib/storage';
import type { TodayReading, StreakState } from '../lib/storage';
import { checkContent } from '../lib/filter';
import { getDailyNumbersInsight } from '../lib/grok';
import { track } from '../lib/analytics';

// Provider switched to Groq Cloud (was xAI Grok). New key var is
// EXPO_PUBLIC_GROQ_API_KEY; the old name is honoured as a fallback so a
// legacy .env keeps working until the user rotates the key.
const GROK_API_KEY =
  process.env.EXPO_PUBLIC_GROQ_API_KEY ??
  process.env.EXPO_PUBLIC_GROK_API_KEY ??
  '';
const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6];

function sgtCountdown(): string {
  const nowSgt = Date.now() + 8 * 60 * 60 * 1000;
  const ms = 86400000 - (nowSgt % 86400000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Decorative "Today's Blessing Pot" amount — symbolic, NOT a real prize.
// Anchored on the auspicious 8s for a culturally-resonant headline number.
// Three deterministic digits vary per SGT date so the headline shifts
// gently day to day and feels alive.
function dailyBlessingPot(): string {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const seed = parseInt(sgt.toISOString().split('T')[0].replace(/-/g, ''), 10);
  const a = (seed * 9301 + 49297) % 9;       // 0–8
  const b = (seed * 1103 + 12345) % 9;       // 0–8
  const c = (seed * 4391 + 7919) % 9;        // 0–8
  // 8,abc8,888 — leading 8, then three rotating digits, trailing 888.
  return `S$ 8,${a}${b}${c}8,888`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-SG', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedIntentions, setSelectedIntentions] = useState<IntentionId[]>(['blessing']);
  const [selectedCount, setSelectedCount] = useState(6);
  const [drawsToday, setDrawsToday] = useState(0);
  const [premium, setPremium] = useState(false);
  const [ready, setReady] = useState(false);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(true);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [todayReading, setTodayReading] = useState<TodayReading | null>(null);
  const [signalNumber, setSignalNumber] = useState<number | null>(null);
  const [signalDraft, setSignalDraft] = useState('');
  const [signalError, setSignalError] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [previewUnlocked, setPreviewUnlocked] = useState(false);

  // 3 auspicious numbers that rotate daily based on SGT date
  const featuredNumbers = useMemo(() => getDailyFeaturedNumbers(), []);
  const dailyExtras = useMemo(() => getDailyExtras(), []);
  const almanac = useMemo(() => getDailyAlmanac(), []);

  // Parse the AI response into a per-number map: { 8: 'reason…', 28: 'reason…', … }
  const insightMap = useMemo<Record<number, string>>(() => {
    if (!insight) return {};
    const map: Record<number, string> = {};
    for (const n of featuredNumbers) {
      const m = insight.match(new RegExp(`^${n}\\s*:\\s*(.+)`, 'm'));
      if (m) map[n] = m[1].trim();
    }
    return map;
  }, [insight, featuredNumbers]);

  // Subtle entry fade-up
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready) return;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [ready, fadeAnim]);

  // Gentle pulsing glow on hero balls. Loops while the today-reading hero is on screen.
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!todayReading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1, duration: 1400,
          easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0, duration: 1400,
          easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [todayReading, pulseAnim]);

  // Slow rotation on the 福 glyph aura — purely decorative
  const auraSpin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready) return;
    const loop = Animated.loop(
      Animated.timing(auraSpin, {
        toValue: 1, duration: 18000,
        easing: Easing.linear, useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [ready, auraSpin]);

  // Stagger reveal of the daily extras card
  const extrasAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready) return;
    Animated.timing(extrasAnim, {
      toValue: 1, duration: 700, delay: 280,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [ready, extrasAnim]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const done = await isOnboardingComplete();
        if (!done) { router.replace('/onboarding/welcome'); return; }
        const [p, count, prem, todays, sig, st, preview] = await Promise.all([
          getProfile(),
          getTodayDrawCount(),
          isPremium(),
          getTodayReading(),
          getTodaySignalNumber(),
          getStreakState(),
          isPremiumPreviewUnlocked(),
        ]);
        setProfile(p);
        setDrawsToday(count);
        setPremium(prem);
        setTodayReading(todays);
        setSignalNumber(sig);
        setStreak(st);
        setPreviewUnlocked(preview);
        setReady(true);
        track('home_visit', { hasReadingToday: !!todays, premium: prem });
      })();
    }, [])
  );

  // Fetch daily AI insight — cached per SGT day, at most one Grok call per user per day.
  // Falls through to the offline stub when no API key, so the card always populates.
  useEffect(() => {
    if (!ready) return;
    setInsightLoading(true);
    setInsightError(null);
    (async () => {
      const cached = await getDailyInsightCache();
      if (cached) { setInsight(cached); setInsightLoading(false); return; }
      const result = await getDailyNumbersInsight(featuredNumbers, GROK_API_KEY, dailyExtras.theme);
      if (result.ok) {
        setInsight(result.content);
        // Don't cache the stub — let a real key, when added, replace it next launch.
        if (!result.stub) await saveDailyInsightCache(result.content);
      } else {
        setInsightError(
          result.error === 'network_error' || result.error === 'timeout'
            ? 'Connection issue — pull to refresh'
            : 'AI insight unavailable right now'
        );
      }
      setInsightLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Live countdown to SGT midnight — always ticking now that the prize-pot
  // card on the home screen also reads it.
  useEffect(() => {
    setCountdown(sgtCountdown());
    const id = setInterval(() => setCountdown(sgtCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!ready) return null;

  const hasReadingToday = !!todayReading && (premium === false || drawsToday > 0);
  const canDraw = (premium || drawsToday < FREE_DRAWS_PER_DAY) && !todayReading;

  const toggleIntention = (id: IntentionId) => {
    setSelectedIntentions(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
    );
  };

  const handleReveal = async () => {
    if (todayReading) {
      track('why_these_numbers_tapped', { source: 'today_hero' });
      router.push({
        pathname: '/analysis',
        params: {
          numbers: JSON.stringify(todayReading.numbers),
          intentions: JSON.stringify(todayReading.intentions),
        },
      });
      return;
    }
    if (!canDraw) {
      track('paywall_reached', { source: 'home_cta_no_draws' });
      router.push('/paywall');
      return;
    }
    if (!profile) { router.push('/onboarding/profile'); return; }
    const numbers = deriveFromProfile(
      profile.birthdate, profile.name, selectedIntentions, selectedCount,
      {
        zodiac: profile.zodiac,
        favouriteNumber: profile.favouriteNumber,
        signalNumber: signalNumber ?? undefined,
        avoidNumbers: profile.avoidNumbers,
        pantangMode: profile.pantangMode,
      }
    );
    router.push({
      pathname: '/draw',
      params: {
        numbers: JSON.stringify(numbers),
        intentions: JSON.stringify(selectedIntentions),
      },
    });
  };

  const handleSetSignal = async () => {
    setSignalError(null);
    const trimmed = signalDraft.trim();
    if (!trimmed) return;
    const safety = checkContent(trimmed);
    if (!safety.safe) {
      setSignalError('Please choose a 1–49 number, not a gambling phrase.');
      return;
    }
    const n = parseInt(trimmed, 10);
    if (!Number.isInteger(n) || n < 1 || n > 49) {
      setSignalError('Enter a number between 1 and 49.');
      return;
    }
    await setTodaySignalNumber(n);
    setSignalNumber(n);
    setSignalDraft('');
    track('signal_set', { number: n });
  };

  const firstName = profile?.name.split(' ')[0] ?? '';
  const drawsLeft = Math.max(0, FREE_DRAWS_PER_DAY - drawsToday);
  // Free user temporarily sees the locked daily-extras when their streak
  // milestone unlocked a one-day preview. Premium users always see them.
  const dailyExtrasUnlocked = premium || previewUnlocked;

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const auraRotation = auraSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Top ticker */}
        <View style={styles.ticker}>
          <AppText
            style={styles.tickerText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            ◉ BLESSED NUMBERS · 福 星 號
          </AppText>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={12}
          >
            <AppText style={styles.settingsIcon}>⚙</AppText>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wordmark */}
          <View style={styles.wordmark}>
            <AppText style={styles.wordmarkCn}>福 星 號</AppText>
            <AppText style={styles.wordmarkEn}>
              BLESSED <AppText style={styles.wordmarkGold}>88</AppText>
            </AppText>
            {firstName ? (
              <AppText style={styles.greeting}>Welcome, {firstName}</AppText>
            ) : null}
            <View style={styles.aiBadge}>
              <AppText style={styles.aiBadgeText}>✦ AI POWERED · NEW READING DAILY</AppText>
            </View>
            {streak && streak.streakCount > 0 ? (
              <View
                style={[
                  styles.streakChip,
                  streak.streakCount >= STREAK_PREVIEW_MILESTONE && styles.streakChipMilestone,
                ]}
                accessibilityLabel={`Streak: ${streak.streakCount} days`}
              >
                <AppText style={styles.streakGlyph}>★</AppText>
                <AppText style={styles.streakText}>
                  {streak.streakCount}-day streak
                  {previewUnlocked ? ' · pattern unlocked today' : ''}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Today's Blessing Pot — decorative, symbolic. NOT a real prize.
              Pure visual element matching the temple/lottery aesthetic. */}
          <View style={styles.potCard}>
            <View style={styles.potAura} />
            <View style={styles.potHeader}>
              <AppText style={styles.potEyebrow}>◉ TODAY'S BLESSING POT</AppText>
              <AppText style={styles.potGlyph}>福</AppText>
            </View>
            <AppText style={styles.potAmount}>{dailyBlessingPot()}</AppText>
            <AppText style={styles.potCaption}>
              of good fortune energy · symbolic only
            </AppText>
            <View style={styles.potCountdownRow}>
              {(() => {
                const parts = (countdown || sgtCountdown()).split(':');
                const labels = ['HRS', 'MIN', 'SEC'];
                return parts.map((p, i) => (
                  <View key={i} style={styles.potTimeBox}>
                    <AppText style={styles.potTimeValue}>{p}</AppText>
                    <AppText style={styles.potTimeLabel}>{labels[i]}</AppText>
                  </View>
                ));
              })()}
            </View>
            <AppText style={styles.potDisclaimer}>
              Resets at Singapore midnight · entertainment only
            </AppText>
          </View>

          {/* Today's Reflection strip — single plain-language line */}
          <TouchableOpacity
            style={styles.almanacStrip}
            activeOpacity={0.85}
            onPress={() => {
              track('almanac_strip_tapped');
              router.push('/almanac');
            }}
            accessibilityRole="button"
            accessibilityLabel={Strings.home.almanacStrip.eyebrow}
          >
            <AppText style={styles.almanacStripEyebrow}>{Strings.home.almanacStrip.eyebrow}</AppText>
            <View style={styles.almanacStripBody}>
              <AppText style={styles.almanacStripLine}>
                {almanac.energy === 'bright' ? Strings.home.almanacStrip.bright
                  : almanac.energy === 'steady' ? Strings.home.almanacStrip.steady
                  : Strings.home.almanacStrip.gentle}
              </AppText>
              <AppText style={styles.almanacStripCta}>{Strings.home.almanacStrip.cta} →</AppText>
            </View>
          </TouchableOpacity>

          {/* Daily draw status — only shown when no reading yet */}
          {!hasReadingToday && (
            <View style={[styles.drawBadge, premium && styles.drawBadgePremium]}>
              <AppText style={styles.drawBadgeText}>
                {premium
                  ? Strings.home.premiumBadge
                  : drawsLeft > 0
                    ? `${drawsLeft} free reading${drawsLeft > 1 ? 's' : ''} today`
                    : countdown
                      ? `Resets in ${countdown}`
                      : Strings.home.noFreeReadings}
              </AppText>
              {!premium && (
                <TouchableOpacity
                  onPress={() => {
                    track('paywall_reached', { source: 'home_badge' });
                    router.push('/paywall');
                  }}
                >
                  <AppText style={styles.upgradeLink}>Upgrade →</AppText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Today's locked-in reading — hero card with 2x3 number grid */}
          {hasReadingToday && todayReading && (
            <View style={styles.todayHero}>
              <View style={styles.todayHeroHeader}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.todayHeroEyebrow}>★ YOUR BLESSED READING · {todayLabel().toUpperCase()}</AppText>
                  <AppText style={styles.todayHeroTitle}>Today's Numbers</AppText>
                </View>
                <Animated.Text
                  style={[styles.todayHeroGlyph, { transform: [{ rotate: auraRotation }] }]}
                  allowFontScaling={false}
                >
                  福
                </Animated.Text>
              </View>

              <View style={styles.todayHeroBalls}>
                {todayReading.numbers.map((n, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.todayBallWrap,
                      { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
                    ]}
                  >
                    <NumberBall number={n} size={64} variant="red" />
                  </Animated.View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.todayHeroCta}
                onPress={handleReveal}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <AppText style={styles.todayHeroCtaLabel}>OPEN MY READING →</AppText>
              </TouchableOpacity>

              <AppText style={styles.todayHeroNote}>
                Returns in {countdown || sgtCountdown()} · Singapore Time
              </AppText>
            </View>
          )}

          {/* Today's 3 auspicious numbers (community / shared) */}
          <View style={styles.featuredCard}>
            <View style={styles.featuredHeader}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.featuredLabel}>TODAY'S AUSPICIOUS NUMBERS</AppText>
                <AppText style={styles.featuredDate}>
                  AI Powered · refreshed daily · {todayLabel()}
                </AppText>
              </View>
              <AppText style={styles.featuredGlyph}>吉</AppText>
            </View>

            <View style={styles.ballRow}>
              {featuredNumbers.map((n, i) => (
                <View key={i} style={styles.featuredBallItem}>
                  <NumberBall number={n} size={68} variant="red" />
                  <AppText style={styles.featuredBallNote}>
                    {CULTURAL_NUMBER_NOTES[n] ?? getNumberMeaning(n)}
                  </AppText>
                  <AppText style={styles.featuredBallMeaning}>
                    {insightLoading
                      ? '· · ·'
                      : (insightMap[n] ?? '')}
                  </AppText>
                </View>
              ))}
            </View>
            {insightError && (
              <AppText style={styles.featuredErrorNote}>{insightError}</AppText>
            )}
          </View>

          {/* Daily blessed pattern — theme, timing, direction, avoid. Premium-gated. */}
          <Animated.View
            style={[
              styles.extrasCard,
              {
                opacity: extrasAnim,
                transform: [{ translateY: extrasAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              },
            ]}
          >
            <View style={styles.extrasHeader}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.extrasLabel}>{Strings.home.dailyExtras.title}</AppText>
                <AppText style={styles.extrasDate}>{todayLabel()} · Singapore Time</AppText>
              </View>
              <AppText style={styles.extrasGlyph}>祥</AppText>
            </View>

            {/* Free for all: theme + best timing */}
            <View style={styles.extrasRow}>
              <AppText style={styles.extrasRowLabel}>{Strings.home.dailyExtras.theme}</AppText>
              <AppText style={styles.extrasRowValue}>{dailyExtras.theme}</AppText>
            </View>
            <View style={styles.extrasRow}>
              <AppText style={styles.extrasRowLabel}>{Strings.home.dailyExtras.timing}</AppText>
              <AppText style={styles.extrasRowValue}>{dailyExtras.bestTiming}</AppText>
            </View>

            {/* Premium-only: direction + numbers to avoid. Free users see them obscured. */}
            <View style={styles.premiumBlock}>
              <View style={[styles.extrasRow, !dailyExtrasUnlocked && styles.extrasRowObscured]}>
                <AppText style={styles.extrasRowLabel}>{Strings.home.dailyExtras.direction}</AppText>
                <AppText style={styles.extrasRowValue}>
                  {dailyExtrasUnlocked ? dailyExtras.direction : '▓▓▓▓ · ▓'}
                </AppText>
              </View>
              <View style={[styles.extrasRow, !dailyExtrasUnlocked && styles.extrasRowObscured]}>
                <AppText style={styles.extrasRowLabel}>{Strings.home.dailyExtras.avoid}</AppText>
                <AppText style={styles.extrasRowValue}>
                  {dailyExtrasUnlocked ? dailyExtras.avoid.join(', ') : '▓▓, ▓▓, ▓▓'}
                </AppText>
              </View>

              {!dailyExtrasUnlocked && (
                <TouchableOpacity
                  style={styles.lockOverlay}
                  activeOpacity={0.85}
                  onPress={() => {
                    track('locked_item_tapped', { item: 'daily_extras' });
                    track('paywall_reached', { source: 'daily_extras_lock' });
                    router.push('/paywall');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={Strings.home.dailyExtras.premiumLock}
                >
                  <View style={styles.lockBadge}>
                    <AppText style={styles.lockGlyph}>🔒</AppText>
                    <AppText style={styles.lockHint}>
                      {Strings.home.dailyExtras.premiumHint}
                    </AppText>
                    <View style={styles.lockCta}>
                      <AppText style={styles.lockCtaLabel}>
                        {Strings.home.dailyExtras.premiumLock}
                      </AppText>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Entry form — only when allowed to draw */}
          {!hasReadingToday && (
            <>
              {/* Today's personal signal — a single 1–49 the user has noticed.
                  Stored locally for the day; folded into deriveFromProfile when
                  the user reveals. checkContent gates the input so a gambling
                  phrase typed in here can never reach storage. */}
              <AppText style={styles.sectionLabel}>◉ {Strings.home.signal.label}</AppText>
              <AppText style={styles.sectionHint}>{Strings.home.signal.hint}</AppText>
              {signalNumber ? (
                <View style={styles.signalRow}>
                  <View style={styles.signalChip}>
                    <AppText style={styles.signalChipNumber}>{signalNumber}</AppText>
                    <AppText style={styles.signalChipLabel}>{Strings.home.signal.savedLabel}</AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => { setSignalNumber(null); setSignalDraft(''); setSignalError(null); }}
                    accessibilityRole="button"
                    accessibilityLabel={Strings.home.signal.clear}
                  >
                    <AppText style={styles.signalClear}>{Strings.home.signal.clear}</AppText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.signalRow}>
                  <TextInput
                    style={[styles.signalInput, signalError ? styles.signalInputError : null]}
                    value={signalDraft}
                    onChangeText={(t) => {
                      setSignalDraft(t.replace(/\D/g, '').slice(0, 2));
                      setSignalError(null);
                    }}
                    keyboardType="number-pad"
                    placeholder={Strings.home.signal.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    maxLength={2}
                    accessibilityLabel={Strings.home.signal.label}
                  />
                  <TouchableOpacity
                    style={[styles.signalCta, !signalDraft && styles.signalCtaDisabled]}
                    onPress={handleSetSignal}
                    disabled={!signalDraft}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    <AppText style={styles.signalCtaLabel}>{Strings.home.signal.cta}</AppText>
                  </TouchableOpacity>
                </View>
              )}
              {signalError ? (
                <AppText style={styles.signalErrorText}>{signalError}</AppText>
              ) : null}

              <AppText style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>◉ {Strings.home.intentionLabel}</AppText>
              <AppText style={styles.sectionHint}>{Strings.home.intentionHint}</AppText>
              <View style={styles.intentionGrid}>
                {INTENTIONS.map(i => {
                  const active = selectedIntentions.includes(i.id as IntentionId);
                  return (
                    <TouchableOpacity
                      key={i.id}
                      style={[styles.intentionCell, active && styles.intentionCellActive]}
                      onPress={() => toggleIntention(i.id as IntentionId)}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                    >
                      <AppText style={[styles.intentionGlyph, active && styles.intentionGlyphActive]}>
                        {i.glyph}
                      </AppText>
                      <AppText style={[styles.intentionLabel, active && styles.intentionLabelActive]}>
                        {i.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppText style={styles.sectionLabel}>◉ {Strings.home.countLabel}</AppText>
              <View style={styles.countRow}>
                {COUNT_OPTIONS.map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.countBtn, selectedCount === n && styles.countBtnActive]}
                    onPress={() => setSelectedCount(n)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedCount === n }}
                  >
                    <AppText style={[styles.countLabel, selectedCount === n && styles.countLabelActive]}>
                      {n}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.cta, !canDraw && styles.ctaLocked]}
                onPress={handleReveal}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <AppText style={[styles.ctaLabel, !canDraw && styles.ctaLabelLocked]}>
                  {!profile
                    ? 'SET UP YOUR PROFILE →'
                    : canDraw
                      ? 'REVEAL MY BLESSED NUMBERS'
                      : 'UNLOCK MORE READINGS'}
                </AppText>
                {profile && (
                  <AppText style={[styles.ctaCn, !canDraw && styles.ctaLabelLocked]}>→</AppText>
                )}
              </TouchableOpacity>
              <AppText style={styles.ctaNote}>
                {!profile
                  ? 'Enter your name & birth date to begin'
                  : canDraw
                    ? `${selectedCount} NUMBER${selectedCount > 1 ? 'S' : ''} · PERSONAL READING`
                    : 'Upgrade to Premium for unlimited daily readings'}
              </AppText>
            </>
          )}

          {/* History shortcut */}
          <TouchableOpacity
            style={styles.historyLink}
            onPress={() => router.push('/history')}
            activeOpacity={0.7}
          >
            <AppText style={styles.historyLinkText}>◉ VIEW PAST READINGS</AppText>
          </TouchableOpacity>
        </ScrollView>
        </Animated.View>
        <DisclaimerBanner />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  ticker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 20, marginTop: 8, marginBottom: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.primary, borderRadius: 6,
  },
  tickerText: {
    flex: 1,
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 1.5, color: Colors.gold,
    marginRight: 8,
  },
  settingsIcon: { fontSize: 22, color: Colors.gold },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  wordmark: { alignItems: 'center', marginBottom: Spacing.md },
  wordmarkCn: {
    fontFamily: 'Lora_600SemiBold', fontSize: 20,
    letterSpacing: 8, color: Colors.gold, marginBottom: 4,
  },
  wordmarkEn: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 40, fontWeight: '900', color: Colors.textPrimary,
    letterSpacing: -1.5, lineHeight: 44,
  },
  wordmarkGold: { color: Colors.gold },
  greeting: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 18, color: Colors.textSecondary, marginTop: 8, letterSpacing: 1,
  },
  aiBadge: {
    marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: 'rgba(244,196,48,0.14)',
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(244,196,48,0.45)',
  },
  aiBadgeText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 11, letterSpacing: 1.5, color: Colors.gold,
  },

  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    maxWidth: '100%',
    flexShrink: 1,
  },
  streakChipMilestone: {
    borderColor: Colors.gold,
    backgroundColor: Colors.surfaceAlt,
  },
  streakGlyph: {
    fontFamily: 'Lora_700Bold', fontSize: 14, color: Colors.gold,
  },
  streakText: {
    flexShrink: 1,
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 13, color: Colors.textSecondary, letterSpacing: 0.5,
  },

  // Today's Blessing Pot — decorative jackpot-style card
  potCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    overflow: 'hidden',
    ...Shadow.elevated,
  },
  potAura: {
    position: 'absolute',
    top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(244,196,48,0.20)',
  },
  potHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  potEyebrow: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 2, color: Colors.gold,
    flexShrink: 1,
  },
  potGlyph: {
    fontFamily: 'Lora_700Bold',
    fontSize: 28, color: Colors.gold,
  },
  potAmount: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 38, fontWeight: '900',
    color: Colors.textPrimary, letterSpacing: -1,
    marginBottom: 4,
  },
  potCaption: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, color: 'rgba(255,248,231,0.80)',
    marginBottom: 14,
  },
  potCountdownRow: {
    flexDirection: 'row', gap: 8,
    marginBottom: 10,
  },
  potTimeBox: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  potTimeValue: {
    fontFamily: 'Lora_700Bold',
    fontSize: 22, color: Colors.gold,
    letterSpacing: -0.5,
  },
  potTimeLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 10, letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  potDisclaimer: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 11, fontStyle: 'italic',
    color: 'rgba(255,248,231,0.65)',
    textAlign: 'center',
  },

  // Today's Reflection strip — one plain line, large type
  almanacStrip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  almanacStripEyebrow: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 2, color: Colors.gold,
    marginBottom: 6,
  },
  almanacStripBody: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: Spacing.sm,
  },
  almanacStripLine: {
    flex: 1,
    fontFamily: 'Lora_600SemiBold',
    fontSize: 18, color: Colors.textPrimary, lineHeight: 24,
  },
  almanacStripCta: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 14, color: Colors.gold,
  },

  signalRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  signalInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontFamily: 'Lora_700Bold',
    fontSize: 22, color: Colors.textPrimary,
    textAlign: 'center',
  },
  signalInputError: { borderColor: Colors.error },
  signalCta: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  signalCtaDisabled: { opacity: 0.4 },
  signalCtaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 14, letterSpacing: 1.5, color: Colors.gold,
  },
  signalChip: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.gold,
  },
  signalChipNumber: {
    fontFamily: 'Lora_700Bold', fontSize: 24, color: Colors.gold,
    minWidth: 32, textAlign: 'center',
  },
  signalChipLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 1.5, color: Colors.textMuted,
  },
  signalClear: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 14, color: Colors.gold, paddingHorizontal: 8,
  },
  signalErrorText: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, color: Colors.error,
    marginTop: -4, marginBottom: Spacing.sm,
  },

  drawBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: Spacing.lg,
  },
  drawBadgePremium: { borderColor: Colors.gold },
  drawBadgeText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16, color: Colors.textSecondary, flexShrink: 1,
  },
  upgradeLink: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16, color: Colors.gold,
    flexShrink: 0,
  },

  // Today's locked reading hero — 2x3 grid
  todayHero: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    ...Shadow.elevated,
  },
  todayHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  todayHeroEyebrow: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 2, color: Colors.gold,
  },
  todayHeroTitle: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 30, fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  todayHeroGlyph: {
    fontFamily: 'Lora_700Bold',
    fontSize: 42, color: Colors.gold,
  },
  // 3 columns × 2 rows. Each item is 30% width and we let flexbox lay out 2 rows.
  todayHeroBalls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
    marginVertical: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  todayBallWrap: {
    width: '30%',
    alignItems: 'center',
  },
  todayHeroCta: {
    backgroundColor: Colors.gold,
    paddingVertical: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadow.gold,
  },
  todayHeroCtaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 18, fontWeight: '900', letterSpacing: 0.5,
    color: Colors.background,
  },
  todayHeroNote: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, letterSpacing: 1.5,
    color: Colors.gold,
    textAlign: 'center',
    marginTop: 12,
    fontVariant: ['tabular-nums'],
  },

  featuredCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    ...Shadow.card,
  },
  featuredHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.md,
  },
  featuredLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 2, color: Colors.gold,
  },
  featuredDate: {
    fontFamily: 'SourceSans3_400Regular', fontSize: 15,
    color: Colors.textSecondary, marginTop: 4,
  },
  featuredGlyph: { fontFamily: 'Lora_700Bold', fontSize: 30, color: Colors.gold },
  ballRow: {
    flexDirection: 'row', justifyContent: 'space-around',
  },
  featuredBallItem: {
    alignItems: 'center', flex: 1, paddingHorizontal: 6,
  },
  featuredBallNote: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, color: Colors.gold,
    textAlign: 'center', marginTop: 8, lineHeight: 16,
    letterSpacing: 0.3,
  },
  featuredBallMeaning: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', marginTop: 6, lineHeight: 19,
  },
  featuredErrorNote: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, color: Colors.error,
    textAlign: 'center', marginTop: 12, fontStyle: 'italic',
  },

  // Daily extras card with premium gating
  extrasCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.gold,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  extrasHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.md,
  },
  extrasLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 2,
    color: Colors.gold,
  },
  extrasDate: {
    fontFamily: 'SourceSans3_400Regular', fontSize: 14,
    color: Colors.textMuted, marginTop: 4,
  },
  extrasGlyph: { fontFamily: 'Lora_700Bold', fontSize: 30, color: Colors.gold },
  extrasRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', gap: 8,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  extrasRowObscured: {
    opacity: 0.18,
  },
  extrasRowLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 1.5,
    color: Colors.textMuted, flexShrink: 1,
  },
  extrasRowValue: {
    fontFamily: 'Lora_700Bold', fontSize: 18, fontWeight: '900',
    color: Colors.textPrimary, letterSpacing: -0.2,
    flexShrink: 1, flexGrow: 0,
    textAlign: 'right',
  },
  premiumBlock: {
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(13,13,18,0.62)',
    borderRadius: Radius.sm,
  },
  lockBadge: {
    alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs,
  },
  lockGlyph: { fontSize: 26, marginBottom: 2 },
  lockHint: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, color: Colors.textSecondary,
    textAlign: 'center', maxWidth: 240, lineHeight: 18,
  },
  lockCta: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.gold,
    paddingVertical: 10, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    ...Shadow.gold,
  },
  lockCtaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 14, fontWeight: '900',
    color: Colors.background, letterSpacing: 0.5,
  },

  sectionLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 2, color: Colors.gold, marginBottom: 4,
  },
  sectionHint: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 14, color: Colors.textMuted, marginBottom: 12,
  },

  intentionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.xl,
  },
  // 3 cells per row — 30% width each, gap 8 fits within the 100% scrollContent.
  // Wider cells let the 14pt floor labels render on a single line and keep
  // the grid readable at all three text-size scales.
  intentionCell: {
    width: '30%', aspectRatio: 1.05,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 6,
  },
  intentionCellActive: { borderColor: Colors.gold, backgroundColor: Colors.surfaceAlt },
  intentionGlyph: { fontFamily: 'Lora_700Bold', fontSize: 28, color: Colors.textMuted },
  intentionGlyphActive: { color: Colors.gold },
  intentionLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 12,
    letterSpacing: 0.3, color: Colors.textMuted, textAlign: 'center',
  },
  intentionLabelActive: { color: Colors.textSecondary },

  countRow: {
    flexDirection: 'row', gap: 10, marginBottom: Spacing.xl, justifyContent: 'center',
    flexWrap: 'wrap',
  },
  countBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  countBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.primary },
  countLabel: {
    fontFamily: 'Lora_700Bold', fontSize: 22, color: Colors.textMuted,
  },
  countLabelActive: { color: Colors.textPrimary },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 22, borderRadius: Radius.lg,
    backgroundColor: Colors.gold, marginBottom: Spacing.sm, ...Shadow.gold,
  },
  ctaLocked: {
    backgroundColor: Colors.surface, shadowOpacity: 0,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  ctaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 22, fontWeight: '900', letterSpacing: -0.3, color: Colors.background,
  },
  ctaLabelLocked: { color: Colors.textMuted },
  ctaCn: { fontFamily: 'Lora_700Bold', fontSize: 24, color: Colors.background },
  ctaNote: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 12, letterSpacing: 2, color: Colors.textMuted,
    textAlign: 'center', marginBottom: Spacing.lg,
  },

  historyLink: { alignItems: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  historyLinkText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 13, letterSpacing: 2, color: Colors.textSecondary,
  },
});
