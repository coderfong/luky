import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView,
  Animated, Easing, TextInput, ImageBackground, Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { EmbossedText } from '../components/ui/EmbossedText';
import { NumberBall } from '../components/NumberBall';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { LoadingFlash } from '../components/LoadingFlash';
import { Colors, Spacing, Radius, Shadow } from '../constants/theme';
import { Strings } from '../constants/strings';
import {
  INTENTIONS, IntentionId, deriveFromProfile,
  getDailyFeaturedNumbers, getDailyExtras, getNumberMeaning,
  CULTURAL_NUMBER_NOTES, getDailyAlmanac,
} from '../lib/numbers';
import {
  isOnboardingComplete, getProfile, UserProfile,
  getTodayDrawCount, isPremium, FREE_SPINS_PER_DAY,
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
// Slot rack offers exactly two grid sizes: 5×3 or 6×3. Anything fewer than 5
// looks empty in the reel frame; more than 6 won't fit on a phone width.
const COUNT_OPTIONS = [5, 6];

// Custom UI assets: backgrounds, cards, buttons, chips. Each is a 3× retina
// PNG with the unwanted (white/black) backdrop already flood-filled out, so
// they can ride on top of the dark app background without halos. Cards are
// stretched via resizeMode="stretch" so they fill the layout box exactly.
const ASSETS = {
  bgApp: require('../assets/ui/bg-app.png'),
  cardHero: require('../assets/ui/card-hero.png'),
  cardSurface: require('../assets/ui/card-surface.png'),
  cardPremium: require('../assets/ui/card-premium.png'),
  chip: require('../assets/ui/chip.png'),
  intentionCell: require('../assets/ui/intention-cell.png'),
  intentionCellActive: require('../assets/ui/intention-cell-active.png'),
  countBtn: require('../assets/ui/count-btn.png'),
  countBtnActive: require('../assets/ui/count-btn-active.png'),
  ctaGold: require('../assets/ui/cta-gold.png'),
  ctaSecondary: require('../assets/ui/cta-secondary.png'),
  timeBox: require('../assets/ui/time-box.png'),
  // Oriental-casino label PNGs.
  labelAiPowered: require('../assets/ui/label-ai-powered.png'),
  labelTodaysPot: require('../assets/ui/label-todays-pot.png'),
  labelBlessedReading: require('../assets/ui/label-blessed-reading.png'),
  labelTodaysNumbers: require('../assets/ui/label-todays-numbers.png'),
  labelAuspicious: require('../assets/ui/label-auspicious-numbers.png'),
  labelBlessedPattern: require('../assets/ui/label-blessed-pattern.png'),
  labelIntentions: require('../assets/ui/label-intentions.png'),
  labelHowMany: require('../assets/ui/label-how-many.png'),
  labelTodaysSignal: require('../assets/ui/label-todays-signal.png'),
  labelViewPast: require('../assets/ui/label-view-past.png'),
  ctaSaveRead: require('../assets/ui/cta-save-read.png'),
  streakBadge: require('../assets/ui/streak.png'),
  coinFu: require('../assets/ui/coin-fu.png'),
  fortuneFrame: require('../assets/ui/frame.png'),
} as const;

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
  // Shows the LoadingFlash overlay while we navigate to /draw — covers the
  // bundle-load latency so the user always sees animation, never a black screen.
  const [navLoading, setNavLoading] = useState(false);
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

  const hasReadingToday = !!todayReading;
  const spinsLeft = Math.max(0, FREE_SPINS_PER_DAY - drawsToday);
  // Free user can still spin if they have spins remaining; premium always can.
  // Once they commit a reading via the draw screen, hasReadingToday flips and
  // they see the "today's reading" hero instead of the spin form.
  const canDraw = premium || spinsLeft > 0;

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
    // Show the loading flash here on home so the user sees animation
    // immediately, before the draw screen's JS bundle finishes loading.
    setNavLoading(true);
    setTimeout(() => {
      router.push({
        pathname: '/draw',
        params: {
          numbers: JSON.stringify(numbers),
          intentions: JSON.stringify(selectedIntentions),
        },
      });
      // Hide a beat later so the navigation transition stays covered.
      setTimeout(() => setNavLoading(false), 600);
    }, 900);
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
  const drawsLeft = spinsLeft;
  // Free user temporarily sees the locked daily-extras when their streak
  // milestone unlocked a one-day preview. Premium users always see them.
  const dailyExtrasUnlocked = premium || previewUnlocked;

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const auraRotation = auraSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <ImageBackground source={ASSETS.bgApp} style={styles.root} resizeMode="cover">
      {/* Navigation loading flash — covers home→draw transition. Long enough
          to hide the bundle-load latency on the destination screen. */}
      <LoadingFlash visible={navLoading} durationMs={1400} />
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
            <EmbossedText variant="cn" fontSize={22} letterSpacing={6} containerStyle={styles.wordmarkCnWrap}>
              福 星 號
            </EmbossedText>
            <AppText style={styles.wordmarkEn}>
              BLESSED <AppText style={styles.wordmarkGold}>88</AppText>
            </AppText>
            {firstName ? (
              <AppText style={styles.greeting}>Welcome, {firstName}</AppText>
            ) : null}
            <Image source={ASSETS.labelAiPowered} style={styles.aiBadgePng} resizeMode="contain" />
            {streak && streak.streakCount > 0 ? (
              <View
                style={styles.streakWrap}
                accessibilityLabel={`Streak: ${streak.streakCount} days`}
              >
                <Image source={ASSETS.streakBadge} style={styles.streakBg} resizeMode="contain" />
                <AppText style={styles.streakCount}>{streak.streakCount}</AppText>
              </View>
            ) : null}
          </View>

          {/* Today's Blessing Pot — decorative, symbolic. NOT a real prize. */}
          <ImageBackground
            source={ASSETS.cardHero}
            style={styles.potCard}
            imageStyle={styles.cardHeroImage}
            resizeMode="stretch"
          >
            <View style={styles.potAura} />
            <View style={styles.potHeader}>
              <Image source={ASSETS.labelTodaysPot} style={styles.potEyebrowPng} resizeMode="contain" />
              <Image source={ASSETS.coinFu} style={styles.potCoin} resizeMode="contain" />
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
                  <ImageBackground
                    key={i}
                    source={ASSETS.timeBox}
                    style={styles.potTimeBox}
                    imageStyle={styles.timeBoxImage}
                    resizeMode="stretch"
                  >
                    <EmbossedText variant="time" fontSize={22}>{p}</EmbossedText>
                    <AppText style={styles.potTimeLabel}>{labels[i]}</AppText>
                  </ImageBackground>
                ));
              })()}
            </View>
            <AppText style={styles.potDisclaimer}>
              Resets at Singapore midnight · entertainment only
            </AppText>
          </ImageBackground>

          {/* Today's Reflection strip — single plain-language line */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              track('almanac_strip_tapped');
              router.push('/almanac');
            }}
            accessibilityRole="button"
            accessibilityLabel={Strings.home.almanacStrip.eyebrow}
          >
            <ImageBackground
              source={ASSETS.cardSurface}
              style={styles.almanacStrip}
              imageStyle={styles.cardSurfaceImage}
              resizeMode="stretch"
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
            </ImageBackground>
          </TouchableOpacity>

          {/* Daily draw status — only shown when no reading yet */}
          {!hasReadingToday && (
            <ImageBackground
              source={ASSETS.cardSurface}
              style={[styles.drawBadge, premium && styles.drawBadgePremium]}
              imageStyle={styles.cardSurfaceSmallImage}
              resizeMode="stretch"
            >
              <AppText style={styles.drawBadgeText}>
                {premium
                  ? Strings.home.premiumBadge
                  : drawsLeft > 0
                    ? `${drawsLeft} free spin${drawsLeft > 1 ? 's' : ''} today`
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
            </ImageBackground>
          )}

          {/* Today's locked-in reading — hero card with 2x3 number grid */}
          {hasReadingToday && todayReading && (
            <ImageBackground
              source={ASSETS.cardHero}
              style={styles.todayHero}
              imageStyle={styles.cardHeroImage}
              resizeMode="stretch"
            >
              <View style={styles.todayHeroHeader}>
                <View style={{ flex: 1 }}>
                  <Image source={ASSETS.labelBlessedReading} style={styles.todayHeroEyebrowPng} resizeMode="contain" />
                  <Image source={ASSETS.labelTodaysNumbers} style={styles.todayHeroTitlePng} resizeMode="contain" />
                  <AppText style={styles.todayHeroDate}>{todayLabel().toUpperCase()}</AppText>
                </View>
                <Animated.View style={{ transform: [{ rotate: auraRotation }] }}>
                  <EmbossedText variant="cn" fontSize={34}>福</EmbossedText>
                </Animated.View>
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
                onPress={handleReveal}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <ImageBackground
                  source={ASSETS.ctaGold}
                  style={styles.todayHeroCta}
                  imageStyle={styles.ctaImage}
                  resizeMode="stretch"
                >
                  <EmbossedText variant="cta" fontSize={15} letterSpacing={0.8} numberOfLines={1}>
                    OPEN MY READING →
                  </EmbossedText>
                </ImageBackground>
              </TouchableOpacity>

              <AppText style={styles.todayHeroNote}>
                Returns in {countdown || sgtCountdown()} · Singapore Time
              </AppText>
            </ImageBackground>
          )}

          {/* Today's 3 auspicious numbers (community / shared) */}
          <ImageBackground
            source={ASSETS.cardSurface}
            style={styles.featuredCard}
            imageStyle={styles.cardSurfaceImage}
            resizeMode="stretch"
          >
            <View style={styles.featuredHeader}>
              <View style={{ flex: 1 }}>
                <Image source={ASSETS.labelAuspicious} style={styles.featuredLabelPng} resizeMode="contain" />
                <AppText style={styles.featuredDate}>
                  AI Powered · refreshed daily · {todayLabel()}
                </AppText>
              </View>
              <EmbossedText variant="cn" fontSize={26}>吉</EmbossedText>
            </View>

            <View style={styles.ballRow}>
              {featuredNumbers.map((n, i) => {
                const meaning = CULTURAL_NUMBER_NOTES[n] ?? getNumberMeaning(n);
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.featuredBallItem}
                    accessibilityRole="button"
                    accessibilityLabel={`Open detail for ${n}`}
                    activeOpacity={0.85}
                    onPress={() => router.push({
                      pathname: '/auspicious-detail',
                      params: {
                        n: String(n),
                        meaning,
                        insight: insightLoading ? '' : (insightMap[n] ?? ''),
                      },
                    })}
                  >
                    <NumberBall number={n} size={68} variant="red" />
                    <AppText style={styles.featuredBallNote}>{meaning}</AppText>
                    <AppText style={styles.featuredBallTap}>Tap to read →</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
            {insightError && (
              <AppText style={styles.featuredErrorNote}>{insightError}</AppText>
            )}
          </ImageBackground>

          {/* Daily blessed pattern — theme, timing, direction, avoid. Premium-gated. */}
          <Animated.View
            style={{
              opacity: extrasAnim,
              transform: [{ translateY: extrasAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }}
          >
          <ImageBackground
            source={ASSETS.cardPremium}
            style={styles.extrasCard}
            imageStyle={styles.cardPremiumImage}
            resizeMode="stretch"
          >
            <View style={styles.extrasHeader}>
              <View style={{ flex: 1 }}>
                <Image source={ASSETS.labelBlessedPattern} style={styles.extrasLabelPng} resizeMode="contain" />
                <AppText style={styles.extrasDate}>{todayLabel()} · Singapore Time</AppText>
              </View>
              <Image source={ASSETS.coinFu} style={styles.extrasCoin} resizeMode="contain" />
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
          </ImageBackground>
          </Animated.View>

          {/* Entry form — only when allowed to draw */}
          {!hasReadingToday && (
            <>
              <Image source={ASSETS.labelIntentions} style={styles.sectionLabelPng} resizeMode="contain" />
              <AppText style={styles.sectionHint}>{Strings.home.intentionHint}</AppText>
              <View style={styles.intentionGrid}>
                {INTENTIONS.map(i => {
                  const active = selectedIntentions.includes(i.id as IntentionId);
                  return (
                    <TouchableOpacity
                      key={i.id}
                      style={styles.intentionCellWrap}
                      onPress={() => toggleIntention(i.id as IntentionId)}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                    >
                      <ImageBackground
                        source={active ? ASSETS.intentionCellActive : ASSETS.intentionCell}
                        style={styles.intentionCell}
                        imageStyle={styles.intentionCellImage}
                        resizeMode="stretch"
                      >
                        <AppText style={[styles.intentionGlyph, active && styles.intentionGlyphActive]}>
                          {i.glyph}
                        </AppText>
                        <AppText style={[styles.intentionLabel, active && styles.intentionLabelActive]}>
                          {i.label}
                        </AppText>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Image source={ASSETS.labelHowMany} style={styles.sectionLabelPng} resizeMode="contain" />
              <View style={styles.countRow}>
                {COUNT_OPTIONS.map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setSelectedCount(n)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedCount === n }}
                  >
                    <ImageBackground
                      source={selectedCount === n ? ASSETS.countBtnActive : ASSETS.countBtn}
                      style={styles.countBtn}
                      imageStyle={styles.countBtnImage}
                      resizeMode="stretch"
                    >
                      <EmbossedText variant="count" fontSize={26}>{n}</EmbossedText>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleReveal}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <ImageBackground
                  source={canDraw ? ASSETS.ctaGold : ASSETS.ctaSecondary}
                  style={styles.cta}
                  imageStyle={styles.ctaImage}
                  resizeMode="stretch"
                >
                  <EmbossedText
                    variant={canDraw ? 'cta' : 'ctaSecondary'}
                    fontSize={15}
                    letterSpacing={0.8}
                    numberOfLines={1}
                  >
                    {!profile
                      ? 'SET UP YOUR PROFILE →'
                      : canDraw
                        ? 'REVEAL MY BLESSED NUMBERS'
                        : 'UNLOCK MORE READINGS'}
                  </EmbossedText>
                </ImageBackground>
              </TouchableOpacity>
              <AppText style={styles.ctaNote}>
                {!profile
                  ? 'Enter your name & birth date to begin'
                  : canDraw
                    ? `${selectedCount} REELS · ${premium ? '100% LUCKY' : '~40% LUCK PER SLOT'}`
                    : 'Upgrade for unlimited spins · 100% blessed'}
              </AppText>
            </>
          )}

          {/* History shortcut */}
          <TouchableOpacity
            style={styles.historyLink}
            onPress={() => router.push('/history')}
            activeOpacity={0.7}
          >
            <Image source={ASSETS.labelViewPast} style={styles.historyLinkPng} resizeMode="contain" />
          </TouchableOpacity>
        </ScrollView>
        </Animated.View>
        <DisclaimerBanner />
      </SafeAreaView>
    </ImageBackground>
  );
}

// Single drop-shadow recipe re-used by every body text that sits on top of
// a card image — without it, white/cream copy disappears against the busier
// asset textures.
const READ_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1.5 },
  textShadowRadius: 4,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  // imageStyle clips for ImageBackground — keep the rounded card silhouette
  // bounded to its layout box rather than the asset's natural rectangle.
  cardHeroImage:    { borderRadius: Radius.lg },
  cardSurfaceImage: { borderRadius: Radius.lg },
  cardSurfaceSmallImage: { borderRadius: Radius.sm },
  cardPremiumImage: { borderRadius: Radius.lg },
  chipImage:        { borderRadius: Radius.full },
  ctaImage:         { borderRadius: Radius.md },
  intentionCellImage: { borderRadius: Radius.md },
  countBtnImage:    { borderRadius: 30 },
  timeBoxImage:     { borderRadius: Radius.sm },

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
  wordmarkCnWrap: { marginBottom: 6 },
  wordmarkEn: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 40, fontWeight: '900', color: Colors.textPrimary,
    letterSpacing: -1.5, lineHeight: 44,
    textAlign: 'center',
    ...READ_SHADOW,
  },
  wordmarkGold: { color: Colors.gold },
  greeting: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 18, color: Colors.textSecondary, marginTop: 8, letterSpacing: 1,
    textAlign: 'center',
    ...READ_SHADOW,
  },
  aiBadge: {
    marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  // PNG-backed AI Powered chip — replaces the chip+text combo above.
  aiBadgePng: {
    width: 300,
    height: 36,
    marginTop: 10,
    alignSelf: 'center',
  },
  // PNG streak chip; we paint the day count over the empty pill on the left.
  // Streak chip — streak.png art has a blank ○ on the left where the day
  // count is painted on top.
  streakWrap: {
    width: 240,
    height: 56,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  streakBg: {
    width: '100%', height: '100%',
  },
  streakCount: {
    position: 'absolute',
    // The painted ○ sits at roughly 17% from the left, vertically centred.
    // We position the digit caption to overlap the ○ centre.
    left: 28, top: 14,
    width: 36,
    textAlign: 'center',
    fontFamily: 'Cinzel_800ExtraBold',
    fontSize: 22, color: '#FFE082',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  aiBadgeText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 11, letterSpacing: 1.5, color: Colors.gold,
    textAlign: 'center',
    ...READ_SHADOW,
  },

  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
    maxWidth: '100%',
    flexShrink: 1,
  },
  streakChipMilestone: {},
  streakGlyph: {
    fontFamily: 'Lora_700Bold', fontSize: 14, color: Colors.gold,
    ...READ_SHADOW,
  },
  streakText: {
    flexShrink: 1,
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 13, color: Colors.cream, letterSpacing: 0.5,
    ...READ_SHADOW,
  },

  potCard: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg + 4,
    marginBottom: Spacing.md,
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
    ...READ_SHADOW,
  },
  potEyebrowPng: {
    width: 240, height: 38,
    flexShrink: 1,
    alignSelf: 'flex-start',
  },
  potCoin: {
    width: 40, height: 40,
  },
  potAmount: {
    fontFamily: 'Teko_700Bold',
    fontSize: 32, color: Colors.gold, letterSpacing: 0,
    marginBottom: 4,
    textAlign: 'left',
    ...READ_SHADOW,
  },
  potCaption: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, color: Colors.cream,
    marginBottom: 14,
    ...READ_SHADOW,
  },
  potCountdownRow: {
    flexDirection: 'row', gap: 8,
    marginBottom: 10,
  },
  potTimeBox: {
    flex: 1, paddingVertical: 6, paddingHorizontal: 6,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
  },
  potTimeLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 10, letterSpacing: 1.5,
    color: Colors.cream,
    marginTop: 0,
    textAlign: 'center',
    ...READ_SHADOW,
  },
  potDisclaimer: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 11, fontStyle: 'italic',
    color: Colors.cream,
    textAlign: 'center',
    ...READ_SHADOW,
  },

  // Today's Reflection strip — one plain line, large type
  almanacStrip: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  almanacStripEyebrow: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 2, color: Colors.gold,
    marginBottom: 6,
    ...READ_SHADOW,
  },
  almanacStripBody: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: Spacing.sm,
  },
  almanacStripLine: {
    flex: 1,
    fontFamily: 'Lora_600SemiBold',
    fontSize: 18, color: Colors.cream, lineHeight: 24,
    ...READ_SHADOW,
  },
  almanacStripCta: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 14, color: Colors.gold,
    ...READ_SHADOW,
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
    borderRadius: Radius.md,
    overflow: 'hidden',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  signalCtaDisabled: { opacity: 0.4 },
  signalChip: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  signalChipNumber: {
    fontFamily: 'Teko_700Bold', fontSize: 28, color: Colors.gold,
    minWidth: 32, textAlign: 'center',
    ...READ_SHADOW,
  },
  signalChipLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 1.5, color: Colors.cream,
    ...READ_SHADOW,
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
    borderRadius: Radius.sm,
    overflow: 'hidden',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: Spacing.lg,
  },
  drawBadgePremium: {},
  drawBadgeText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16, color: Colors.cream, flexShrink: 1,
    ...READ_SHADOW,
  },
  upgradeLink: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16, color: Colors.gold,
    flexShrink: 0,
    ...READ_SHADOW,
  },

  // Today's locked reading hero, wrapped in fortune-frame.png. The frame
  // artwork has its own gold border & dragons on the outer ~36px, so we
  // pad the card more aggressively so content lands inside the central
  // panels.
  todayHero: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl + 12,
    paddingVertical: Spacing.xl + 16,
    marginBottom: Spacing.lg,
    minHeight: 460,
    overflow: 'hidden',
  },
  fortuneFrameImage: {
    // Frame is a single 9-slice ornament — let it stretch fully so
    // content panels align with the card's interior.
    borderRadius: Radius.lg,
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
    ...READ_SHADOW,
  },
  todayHeroEyebrowPng: {
    width: 300, height: 36,
    alignSelf: 'flex-start',
  },
  todayHeroTitle: {
    fontFamily: 'Cinzel_800ExtraBold',
    fontSize: 20,
    color: Colors.cream,
    letterSpacing: 0.5,
    marginTop: 4,
    ...READ_SHADOW,
  },
  todayHeroTitlePng: {
    width: 260, height: 52,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  todayHeroDate: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 11, letterSpacing: 1.6, color: Colors.cream,
    marginTop: 2,
    ...READ_SHADOW,
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
    paddingVertical: 18,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  todayHeroNote: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, letterSpacing: 1.5,
    color: Colors.gold,
    textAlign: 'center',
    marginTop: 12,
    fontVariant: ['tabular-nums'],
    ...READ_SHADOW,
  },

  featuredCard: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg + 4,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.card,
  },
  featuredHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.md,
  },
  featuredLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 2, color: Colors.gold,
    ...READ_SHADOW,
  },
  featuredLabelPng: {
    width: 300, height: 36,
    alignSelf: 'flex-start',
  },
  featuredDate: {
    fontFamily: 'SourceSans3_400Regular', fontSize: 15,
    color: Colors.cream, marginTop: 4,
    ...READ_SHADOW,
  },
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
    ...READ_SHADOW,
  },
  featuredBallTap: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 11, color: Colors.cream,
    textAlign: 'center', marginTop: 6,
    fontStyle: 'italic',
    ...READ_SHADOW,
  },
  featuredBallMeaning: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 14, color: Colors.cream,
    textAlign: 'center', marginTop: 6, lineHeight: 19,
    ...READ_SHADOW,
  },
  featuredErrorNote: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, color: Colors.error,
    textAlign: 'center', marginTop: 12, fontStyle: 'italic',
  },

  // Daily extras card with premium gating
  extrasCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg + 4,
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
    ...READ_SHADOW,
  },
  extrasLabelPng: {
    width: 300, height: 36,
    alignSelf: 'flex-start',
  },
  extrasCoin: {
    width: 44, height: 44,
  },
  extrasDate: {
    fontFamily: 'SourceSans3_400Regular', fontSize: 14,
    color: Colors.cream, marginTop: 4,
    ...READ_SHADOW,
  },
  extrasRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', gap: 8,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: 1, borderTopColor: 'rgba(244,196,48,0.25)',
  },
  extrasRowObscured: {
    opacity: 0.18,
  },
  extrasRowLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 1.5,
    color: Colors.cream, flexShrink: 1,
    ...READ_SHADOW,
  },
  extrasRowValue: {
    fontFamily: 'Lora_700Bold', fontSize: 18, fontWeight: '900',
    color: Colors.textPrimary, letterSpacing: -0.2,
    flexShrink: 1, flexGrow: 0,
    textAlign: 'right',
    ...READ_SHADOW,
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
    ...READ_SHADOW,
  },
  sectionLabelPng: {
    width: 300, height: 38,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  sectionHint: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 14, color: Colors.cream, marginBottom: 12,
    ...READ_SHADOW,
  },

  intentionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.xl,
  },
  // 3 cells per row — 30% width each, gap 8 fits within the 100% scrollContent.
  // Wider cells let the 14pt floor labels render on a single line and keep
  // the grid readable at all three text-size scales.
  intentionCellWrap: {
    width: '30%', aspectRatio: 1.05,
  },
  intentionCell: {
    flex: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', gap: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  intentionGlyph: {
    fontFamily: 'NotoSerifSC_700Bold', fontSize: 22,
    lineHeight: 24,
    color: Colors.cream, textAlign: 'center',
    marginBottom: 0,
    ...READ_SHADOW,
  },
  intentionGlyphActive: { color: Colors.gold },
  intentionLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.3, color: Colors.cream, textAlign: 'center',
    marginTop: 1,
    ...READ_SHADOW,
  },
  intentionLabelActive: { color: Colors.goldHighlight },

  countRow: {
    flexDirection: 'row', gap: 10, marginBottom: Spacing.xl, justifyContent: 'center',
    flexWrap: 'wrap',
  },
  countBtn: {
    width: 60, height: 60, borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  countBtnActive: {},

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 22, borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  ctaLocked: {},
  ctaLabelLocked: {},
  ctaNote: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 12, letterSpacing: 2, color: Colors.cream,
    textAlign: 'center', marginBottom: Spacing.lg,
    ...READ_SHADOW,
  },

  historyLink: { alignItems: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  historyLinkText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 13, letterSpacing: 2, color: Colors.cream,
    ...READ_SHADOW,
  },
  historyLinkPng: {
    width: 260, height: 36,
    alignSelf: 'center',
  },
});
