import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, SafeAreaView, TouchableOpacity,
  Animated, Easing, Vibration, Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { NumberBall } from '../components/NumberBall';
import { Colors, Spacing, Radius } from '../constants/theme';
import {
  saveTodayReading, incrementTodayDrawCount,
} from '../lib/storage';

const { width: SCREEN_W } = Dimensions.get('window');

const CHAMBER_SIZE = Math.min(280, SCREEN_W - 80);
const CHAMBER_RADIUS = CHAMBER_SIZE / 2;
const BALL_SIZE = 64;
const SLOT_BALL_SIZE = 52;

// Ghost balls that orbit inside the chamber — purely decorative
const ORBITS = [
  { radius: 0.30, speed: 3200, offset: 0.00, size: 32, n: 8,  variant: 'red' as const },
  { radius: 0.42, speed: 4400, offset: 0.20, size: 28, n: 28, variant: 'gold' as const },
  { radius: 0.30, speed: 3700, offset: 0.45, size: 30, n: 6,  variant: 'red' as const },
  { radius: 0.45, speed: 5100, offset: 0.65, size: 26, n: 18, variant: 'red' as const },
  { radius: 0.36, speed: 4000, offset: 0.85, size: 28, n: 9,  variant: 'gold' as const },
  { radius: 0.40, speed: 5500, offset: 0.10, size: 24, n: 38, variant: 'red' as const },
  { radius: 0.34, speed: 3500, offset: 0.55, size: 30, n: 16, variant: 'red' as const },
  { radius: 0.43, speed: 4700, offset: 0.30, size: 26, n: 26, variant: 'gold' as const },
  { radius: 0.25, speed: 2900, offset: 0.40, size: 22, n: 88, variant: 'gold' as const },
  { radius: 0.48, speed: 6000, offset: 0.75, size: 24, n: 36, variant: 'red' as const },
];

const SPARKLE_COUNT = 10;

// Tunables
const COUNTDOWN_STEP_MS = 700;
const PRE_BALL_DELAY = 380;
const BALL_TICKER_MS = 480;       // number flicker before settling
const BALL_FLIGHT_MS = 1100;      // chute exit → slot
const POST_LAND_DELAY = 320;

export default function DrawScreen() {
  const { numbers: numbersParam, intentions: intentionsParam } = useLocalSearchParams<{
    numbers: string;
    intentions: string;
  }>();

  const numbers: number[] = numbersParam ? JSON.parse(numbersParam) : [];
  const intentions: string[] = intentionsParam ? JSON.parse(intentionsParam) : [];

  const [revealedCount, setRevealedCount] = useState(0);
  const [currentBallNumber, setCurrentBallNumber] = useState<number | null>(null);
  const [calloutText, setCalloutText] = useState<string | null>(null);
  const [countdownStep, setCountdownStep] = useState<number | null>(null); // 3, 2, 1, null
  const [persisted, setPersisted] = useState(false);
  const allRevealed = revealedCount >= numbers.length;

  // ─── Persistent loops ───
  const chamberSpin = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const orbitAnims = useRef(ORBITS.map(() => new Animated.Value(0))).current;

  // Chamber shake (during ejection)
  const chamberShakeX = useRef(new Animated.Value(0)).current;
  const chamberShakeY = useRef(new Animated.Value(0)).current;
  const chamberScale = useRef(new Animated.Value(1)).current;

  // Active ball animation
  const ballProgress = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(0)).current;

  // Per-slot landed state
  const slotScales = useRef(numbers.map(() => new Animated.Value(0))).current;
  const slotGlows = useRef(numbers.map(() => new Animated.Value(0))).current;

  // Sparkle burst (one set, repositioned per landing)
  const sparkleAnims = useRef(
    Array.from({ length: SPARKLE_COUNT }, () => ({
      anim: new Animated.Value(0),
      angle: 0,
    }))
  ).current;
  const [sparkleOrigin, setSparkleOrigin] = useState<{ x: number; y: number } | null>(null);

  // Countdown
  const countdownScale = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;

  // Callout
  const calloutOpacity = useRef(new Animated.Value(0)).current;
  const calloutScale = useRef(new Animated.Value(0.8)).current;

  // Finale
  const finaleAnim = useRef(new Animated.Value(0)).current;

  // Number ticker on rolling ball
  const tickerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute slot center positions (relative to slots row container)
  const slotCount = numbers.length;
  const slotSpacing = 6;
  const slotTotalWidth = slotCount * SLOT_BALL_SIZE + (slotCount - 1) * slotSpacing;
  const slotPositions = numbers.map((_, i) =>
    -slotTotalWidth / 2 + i * (SLOT_BALL_SIZE + slotSpacing) + SLOT_BALL_SIZE / 2
  );

  useEffect(() => {
    // Chamber subtle rotation
    Animated.loop(
      Animated.timing(chamberSpin, {
        toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true,
      })
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Ghost ball orbits
    orbitAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: ORBITS[i].speed,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });

    // Begin: countdown 3 → 2 → 1 → reveal
    runCountdown();

    return () => {
      if (tickerInterval.current) clearInterval(tickerInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the reading once all balls have landed
  useEffect(() => {
    if (allRevealed && !persisted) {
      setPersisted(true);
      Vibration.vibrate([0, 60, 80, 60]);
      // Finale celebration
      Animated.spring(finaleAnim, {
        toValue: 1, damping: 8, mass: 1, stiffness: 130,
        useNativeDriver: true,
      }).start();
      (async () => {
        await incrementTodayDrawCount();
        await saveTodayReading(numbers, intentions);
      })();
    }
  }, [allRevealed, persisted, numbers, intentions, finaleAnim]);

  function runCountdown() {
    const steps = [3, 2, 1];
    let i = 0;
    const showStep = () => {
      if (i >= steps.length) {
        setCountdownStep(null);
        runRevealSequence();
        return;
      }
      setCountdownStep(steps[i]);
      Vibration.vibrate(20);
      countdownScale.setValue(0.4);
      countdownOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(countdownOpacity, {
          toValue: 1, duration: 160, easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(countdownScale, {
          toValue: 1, damping: 9, mass: 0.7, stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
      // Hold + fade
      setTimeout(() => {
        Animated.timing(countdownOpacity, {
          toValue: 0, duration: 220, useNativeDriver: true,
        }).start();
      }, COUNTDOWN_STEP_MS - 220);
      i++;
      setTimeout(showStep, COUNTDOWN_STEP_MS);
    };
    setTimeout(showStep, 380);
  }

  function shakeChamber() {
    chamberShakeX.setValue(0);
    chamberShakeY.setValue(0);
    Animated.sequence([
      Animated.timing(chamberShakeX, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(chamberShakeX, { toValue: 7,  duration: 60, useNativeDriver: true }),
      Animated.timing(chamberShakeX, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(chamberShakeX, { toValue: 4,  duration: 50, useNativeDriver: true }),
      Animated.timing(chamberShakeX, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(chamberShakeY, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(chamberShakeY, { toValue: -3, duration: 50, useNativeDriver: true }),
      Animated.timing(chamberShakeY, { toValue: 2, duration: 60, useNativeDriver: true }),
      Animated.timing(chamberShakeY, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(chamberScale, { toValue: 1.05, duration: 80, useNativeDriver: true }),
      Animated.timing(chamberScale, { toValue: 1.0,  duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }

  function startNumberTicker(finalNumber: number) {
    if (tickerInterval.current) clearInterval(tickerInterval.current);
    const id = setInterval(() => {
      setCurrentBallNumber(Math.floor(Math.random() * 49) + 1);
    }, 55);
    tickerInterval.current = id;
    setTimeout(() => {
      if (tickerInterval.current === id) {
        clearInterval(id);
        tickerInterval.current = null;
        setCurrentBallNumber(finalNumber);
      }
    }, BALL_TICKER_MS);
  }

  function fireSparkles(slotIndex: number) {
    const x = slotPositions[slotIndex];
    const y = CHAMBER_RADIUS + 150;
    setSparkleOrigin({ x, y });
    sparkleAnims.forEach((s, i) => {
      s.angle = (i / SPARKLE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
      s.anim.setValue(0);
      Animated.timing(s.anim, {
        toValue: 1,
        duration: 600 + Math.random() * 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }

  function showCallout(text: string) {
    setCalloutText(text);
    calloutOpacity.setValue(0);
    calloutScale.setValue(0.8);
    Animated.parallel([
      Animated.timing(calloutOpacity, {
        toValue: 1, duration: 180, useNativeDriver: true,
      }),
      Animated.spring(calloutScale, {
        toValue: 1, damping: 7, mass: 0.6, stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => {
      Animated.timing(calloutOpacity, {
        toValue: 0, duration: 240, useNativeDriver: true,
      }).start(() => setCalloutText(null));
    }, 950);
  }

  function runRevealSequence() {
    let i = 0;
    const dropOne = () => {
      if (i >= numbers.length) return;
      const idx = i;

      // Pre-eject suspense — chamber rumbles
      shakeChamber();
      Vibration.vibrate(25);

      ballProgress.setValue(0);
      ballScale.setValue(0);
      startNumberTicker(numbers[idx]);

      // Ball appears
      Animated.timing(ballScale, {
        toValue: 1, duration: 200,
        easing: Easing.out(Easing.back(1.7)),
        useNativeDriver: true,
      }).start();

      // Travel
      Animated.timing(ballProgress, {
        toValue: 1, duration: BALL_FLIGHT_MS,
        easing: Easing.bezier(0.4, 0.05, 0.55, 0.95),
        useNativeDriver: true,
      }).start(() => {
        // Land
        Vibration.vibrate(40);
        Animated.parallel([
          Animated.spring(slotScales[idx], {
            toValue: 1, damping: 6, mass: 0.7, stiffness: 230,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(slotGlows[idx], {
              toValue: 1, duration: 180, useNativeDriver: true,
            }),
            Animated.timing(slotGlows[idx], {
              toValue: 0, duration: 700, useNativeDriver: true,
            }),
          ]),
        ]).start();

        fireSparkles(idx);
        showCallout(`★ BLESSED #${idx + 1} · ${numbers[idx]} ★`);
        setRevealedCount(c => c + 1);

        Animated.timing(ballScale, {
          toValue: 0, duration: 140, useNativeDriver: true,
        }).start();

        i++;
        if (i < numbers.length) {
          setTimeout(dropOne, POST_LAND_DELAY);
        } else {
          setCurrentBallNumber(null);
        }
      });
    };

    setTimeout(dropOne, PRE_BALL_DELAY);
  }

  // ─── Active ball trajectory ───
  const activeSlotIdx = Math.max(0, Math.min(revealedCount, numbers.length - 1));
  const targetX = slotPositions[activeSlotIdx] ?? 0;

  const chuteExitX = CHAMBER_RADIUS * 0.7;
  const chuteExitY = CHAMBER_RADIUS * 0.85;

  const ballTranslateX = ballProgress.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [
      chuteExitX,
      chuteExitX + 30,
      (chuteExitX + targetX) * 0.5 + 20,
      targetX,
    ],
  });

  const ballTranslateY = ballProgress.interpolate({
    inputRange: [0, 0.25, 0.55, 0.85, 1],
    outputRange: [
      chuteExitY,
      chuteExitY + 40,
      CHAMBER_RADIUS + 70,
      CHAMBER_RADIUS + 130,
      CHAMBER_RADIUS + 150,
    ],
  });

  const ballRotate = ballProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '900deg'],
  });

  const chamberRotation = chamberSpin.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  });
  const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.10] });
  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.90] });
  const chuteGlowOpacity = ballScale.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <AppText style={styles.eyebrow}>
            {allRevealed ? '★ ALL REVEALED · OPEN YOUR READING ★' : '◉ DRAWING IN PROGRESS'}
          </AppText>
          <AppText variant="heading" style={styles.title}>Blessed Reveal</AppText>
          <AppText style={styles.subtitle}>福 星 顯 現</AppText>
        </View>

        {/* Stage */}
        <View style={styles.stage}>
          {/* Chamber */}
          <Animated.View
            style={[
              styles.chamberWrap,
              {
                transform: [
                  { translateX: chamberShakeX },
                  { translateY: chamberShakeY },
                  { scale: chamberScale },
                ],
              },
            ]}
          >
            {/* Outer pulsing glow */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glow,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            />

            {/* Chamber sphere */}
            <Animated.View
              style={[
                styles.chamber,
                { transform: [{ rotate: chamberRotation }] },
              ]}
            >
              <View style={[styles.chamberRing, { borderColor: Colors.gold, opacity: 0.35 }]} />
              <View style={[styles.chamberRing, styles.chamberRingInner]} />

              {ORBITS.map((orbit, i) => {
                const t = orbitAnims[i];
                const startDeg = orbit.offset * 360;
                const angle = t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [`${startDeg}deg`, `${startDeg + 360}deg`],
                });
                const counterAngle = t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [`${-startDeg}deg`, `${-(startDeg + 360)}deg`],
                });
                const r = orbit.radius * CHAMBER_RADIUS;
                return (
                  <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={[
                      styles.orbitWrap,
                      {
                        transform: [
                          { rotate: angle },
                          { translateY: -r },
                          { rotate: counterAngle },
                        ],
                      },
                    ]}
                  >
                    <NumberBall
                      number={orbit.n}
                      size={orbit.size}
                      variant={orbit.variant}
                    />
                  </Animated.View>
                );
              })}
            </Animated.View>

            {/* Glass sheen */}
            <View style={styles.glassSheen} pointerEvents="none" />
            <View style={styles.glassHighlight} pointerEvents="none" />

            {/* Brand cap */}
            <View style={styles.cap} pointerEvents="none">
              <AppText style={styles.capText}>福</AppText>
            </View>

            {/* Chute */}
            <View style={styles.chuteWrap} pointerEvents="none">
              <Animated.View style={[styles.chuteHole, { opacity: chuteGlowOpacity }]} />
            </View>

            {/* Active rolling ball */}
            {currentBallNumber !== null && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.activeBall,
                  {
                    transform: [
                      { translateX: ballTranslateX },
                      { translateY: ballTranslateY },
                      { rotate: ballRotate },
                      { scale: ballScale },
                    ],
                  },
                ]}
              >
                <NumberBall number={currentBallNumber} size={BALL_SIZE} variant="red" />
              </Animated.View>
            )}

            {/* Sparkle burst — anchored to last landing slot */}
            {sparkleOrigin && (
              <View
                pointerEvents="none"
                style={[
                  styles.sparkleAnchor,
                  {
                    left: CHAMBER_RADIUS + sparkleOrigin.x,
                    top: sparkleOrigin.y,
                  },
                ]}
              >
                {sparkleAnims.map((s, i) => {
                  const distance = 40 + (i % 3) * 10;
                  const dx = Math.cos(s.angle) * distance;
                  const dy = Math.sin(s.angle) * distance;
                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.sparkle,
                        {
                          opacity: s.anim.interpolate({
                            inputRange: [0, 0.2, 1], outputRange: [0, 1, 0],
                          }),
                          transform: [
                            { translateX: s.anim.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                            { translateY: s.anim.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                            { scale: s.anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 0.3] }) },
                          ],
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}

            {/* Countdown overlay */}
            {countdownStep !== null && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.countdownOverlay,
                  {
                    opacity: countdownOpacity,
                    transform: [{ scale: countdownScale }],
                  },
                ]}
              >
                <AppText style={styles.countdownText}>{countdownStep}</AppText>
              </Animated.View>
            )}
          </Animated.View>

          {/* Callout banner */}
          {calloutText && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.callout,
                {
                  opacity: calloutOpacity,
                  transform: [{ scale: calloutScale }],
                },
              ]}
            >
              <AppText style={styles.calloutText}>{calloutText}</AppText>
            </Animated.View>
          )}

          {/* Slots row */}
          <View style={styles.slotsRow}>
            {numbers.map((n, i) => {
              const landed = i < revealedCount;
              return (
                <View key={i} style={styles.slot}>
                  {!landed && <View style={styles.slotRing} />}

                  {landed && (
                    <Animated.View
                      style={{
                        transform: [
                          { scale: slotScales[i].interpolate({
                              inputRange: [0, 1], outputRange: [0.5, 1],
                            }),
                          },
                        ],
                      }}
                    >
                      <NumberBall number={n} size={SLOT_BALL_SIZE} variant="red" />
                    </Animated.View>
                  )}

                  {landed && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.slotGlow,
                        {
                          opacity: slotGlows[i],
                          transform: [{
                            scale: slotGlows[i].interpolate({
                              inputRange: [0, 1], outputRange: [1, 1.7],
                            }),
                          }],
                        },
                      ]}
                    />
                  )}

                  <AppText style={styles.slotIdx}>#{String(i + 1).padStart(2, '0')}</AppText>
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {!allRevealed ? (
            <AppText style={styles.progress}>
              {revealedCount} / {numbers.length} REVEALED
            </AppText>
          ) : (
            <Animated.View
              style={{
                opacity: finaleAnim,
                transform: [{ scale: finaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              }}
            >
              <AppText style={styles.finaleText}>★ ALL BLESSED ★</AppText>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[styles.cta, !allRevealed && styles.ctaWaiting]}
            onPress={() => router.replace({
              pathname: '/analysis',
              params: { numbers: JSON.stringify(numbers), intentions: intentionsParam ?? '[]' },
            })}
            disabled={!allRevealed}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <AppText style={[styles.ctaLabel, !allRevealed && styles.ctaLabelWaiting]}>
              {allRevealed ? 'READ MY BLESSING →' : 'PLEASE WAIT…'}
            </AppText>
          </TouchableOpacity>
          <AppText style={styles.disclaimer}>
            For cultural reflection only — not a prediction or financial guide.
          </AppText>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 10, letterSpacing: 3, color: Colors.gold, marginBottom: 4,
  },
  title: {
    color: Colors.textPrimary, textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 16, letterSpacing: 6, color: Colors.gold,
  },

  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    position: 'relative',
  },

  chamberWrap: {
    width: CHAMBER_SIZE,
    height: CHAMBER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: CHAMBER_SIZE * 1.30,
    height: CHAMBER_SIZE * 1.30,
    borderRadius: (CHAMBER_SIZE * 1.30) / 2,
    backgroundColor: Colors.primary,
  },
  chamber: {
    width: CHAMBER_SIZE,
    height: CHAMBER_SIZE,
    borderRadius: CHAMBER_SIZE / 2,
    backgroundColor: '#1A1018',
    borderWidth: 3,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 14,
  },
  chamberRing: {
    position: 'absolute',
    width: CHAMBER_SIZE - 16,
    height: CHAMBER_SIZE - 16,
    borderRadius: (CHAMBER_SIZE - 16) / 2,
    borderWidth: 1,
  },
  chamberRingInner: {
    width: CHAMBER_SIZE - 60,
    height: CHAMBER_SIZE - 60,
    borderRadius: (CHAMBER_SIZE - 60) / 2,
    borderColor: Colors.primary,
    opacity: 0.25,
    borderStyle: 'dashed',
  },
  orbitWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassSheen: {
    position: 'absolute',
    top: CHAMBER_SIZE * 0.08,
    left: CHAMBER_SIZE * 0.18,
    width: CHAMBER_SIZE * 0.32,
    height: CHAMBER_SIZE * 0.18,
    borderRadius: CHAMBER_SIZE * 0.16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '-22deg' }],
  },
  glassHighlight: {
    position: 'absolute',
    top: CHAMBER_SIZE * 0.18,
    left: CHAMBER_SIZE * 0.22,
    width: CHAMBER_SIZE * 0.10,
    height: CHAMBER_SIZE * 0.06,
    borderRadius: CHAMBER_SIZE * 0.05,
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ rotate: '-22deg' }],
  },
  cap: {
    position: 'absolute',
    top: -22,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary,
    borderWidth: 2, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  capText: {
    fontFamily: 'Lora_700Bold', fontSize: 22, color: Colors.gold,
  },

  chuteWrap: {
    position: 'absolute',
    bottom: CHAMBER_SIZE * 0.05,
    right: CHAMBER_SIZE * 0.12,
    width: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  chuteHole: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },

  activeBall: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    left: CHAMBER_RADIUS - BALL_SIZE / 2,
    top: CHAMBER_RADIUS - BALL_SIZE / 2,
    zIndex: 20,
  },

  sparkleAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 30,
  },
  sparkle: {
    position: 'absolute',
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.gold,
    marginLeft: -4, marginTop: -4,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },

  countdownOverlay: {
    position: 'absolute',
    width: CHAMBER_SIZE,
    height: CHAMBER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  countdownText: {
    fontFamily: 'Lora_700Bold',
    fontSize: 180,
    fontWeight: '900',
    color: Colors.gold,
    letterSpacing: -8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },

  callout: {
    position: 'absolute',
    top: '46%',
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: Radius.sm,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    zIndex: 40,
  },
  calloutText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: Colors.gold,
  },

  slotsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  slot: {
    width: SLOT_BALL_SIZE,
    height: SLOT_BALL_SIZE + 18,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  slotRing: {
    width: SLOT_BALL_SIZE,
    height: SLOT_BALL_SIZE,
    borderRadius: SLOT_BALL_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.surface,
  },
  slotGlow: {
    position: 'absolute',
    top: 0,
    width: SLOT_BALL_SIZE,
    height: SLOT_BALL_SIZE,
    borderRadius: SLOT_BALL_SIZE / 2,
    backgroundColor: Colors.gold,
    opacity: 0,
  },
  slotIdx: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.gold,
    marginTop: 4,
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  progress: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 11, letterSpacing: 2, color: Colors.gold,
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  finaleText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 18, fontWeight: '900', letterSpacing: 4,
    color: Colors.gold, textAlign: 'center',
    textShadowColor: Colors.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    marginBottom: Spacing.sm,
  },
  cta: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.gold,
    borderRadius: Radius.md, paddingVertical: 18,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  ctaWaiting: {
    backgroundColor: Colors.surface, shadowOpacity: 0,
  },
  ctaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 17, fontWeight: '900', letterSpacing: 0.5, color: Colors.background,
  },
  ctaLabelWaiting: { color: Colors.textMuted },
  disclaimer: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 11, color: Colors.textMuted,
    textAlign: 'center', fontStyle: 'italic', marginTop: 4,
  },
});
