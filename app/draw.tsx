import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Dimensions,
  Animated, Easing, Vibration, ImageBackground, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { EmbossedText } from '../components/ui/EmbossedText';
import { SlotReel, SlotReelHandle } from '../components/SlotReel';
import { Colors, Spacing, Radius } from '../constants/theme';
import { Strings } from '../constants/strings';
import {
  saveTodayReading, incrementTodayDrawCount,
  getTodayDrawCount, isPremium,
  FREE_SPINS_PER_DAY, LUCK_FREE, LUCK_PREMIUM,
} from '../lib/storage';
import { applyLuck } from '../lib/numbers';
import { track } from '../lib/analytics';
import { preloadSlotSounds, playSound, stopSound, unloadSlotSounds } from '../lib/slotSounds';

// Slot UI assets ported from MYSTICAL-FOREST-ADVENTURE.
// bg + logo now match the loading-screen art so the transition reads as
// continuous (loading flash → main reveal screen). The logo has its
// solid-white background pre-stripped to a transparent alpha channel
// (see assets/mfa/logo-transparent.png).
const SLOT_ASSETS = {
  bg: require('../assets/mfa/loading-screen/bg.png'),
  reelFrame: require('../assets/mfa/reelFrame.png'),
  logo: require('../assets/mfa/logo-transparent.png'),
  winBg: require('../assets/mfa/win_bg.png'),
  spinGlyph: require('../assets/ui/spin-btn.png'),
  woodFrame: require('../assets/ui/wood-frame.png'),
  // Oriental-casino label PNGs — replace fixed-text RN nodes so they can
  // never overflow / wrap on small screens.
  ctaSpin: require('../assets/ui/cta-spin.png'),
  ctaRespin: require('../assets/ui/cta-respin-misses.png'),
  ctaSaveRead: require('../assets/ui/cta-save-read.png'),
  labelReady: require('../assets/ui/label-ready.png'),
  labelSpinning: require('../assets/ui/label-spinning.png'),
  labelSpinsLeft: require('../assets/ui/label-spins-left.png'),
  labelOutOfSpins: require('../assets/ui/label-out-of-spins.png'),
  labelBlessed: require('../assets/ui/label-blessed.png'),
  coinFu: require('../assets/ui/coin-fu.png'),
};

// Reveal screen built on a slot-machine pattern, ported from the
// MYSTICAL-FOREST-ADVENTURE PIXI prototype. One reel per number; reels
// spin together and stop one-by-one with a stagger, exactly like the
// reference (slot-game.js:669-673 staggered start, lines 645-665 staggered
// stop). Each stop lands on the user's pre-determined number with a small
// bounce + haptic, and the final landing fires a finale callout + reveals
// the "Read My Reading" CTA.

const COUNTDOWN_STEP_MS = 700;
const PRE_SPIN_DELAY = 380;
const STAGGER_MS = 600;            // delay between consecutive reel stops
// Lengthened so the user sees a clear, satisfying blur cycle before
// the first reel begins to decelerate. Anything under ~1500ms reads as
// "the reel snapped to the answer".
const SPIN_BEFORE_FIRST_STOP = 2200;

// Reels are arranged in TWO rows now so each one can be larger:
//   5 reels → 3 on top, 2 on bottom
//   6 reels → 3 on top, 3 on bottom
// We size by the wider row (3 reels) so both rows match.
function splitRows(numReels: number): [number, number] {
  if (numReels <= 3) return [numReels, 0];
  if (numReels === 5) return [3, 2];
  if (numReels === 6) return [3, 3];
  // Generic fallback: ceil/floor split.
  const top = Math.ceil(numReels / 2);
  return [top, numReels - top];
}

// Frame artwork is wider than the cell (lateral dragons) and taller
// (top/bottom ornament). These factors mirror the constants in SlotReel.tsx.
const FRAME_W_FACTOR = 1 / 0.56;
const FRAME_H_FACTOR = 1 / 0.80;

function computeReelSize(numReels: number) {
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const [topCount] = splitRows(numReels);
  const widestRow = Math.max(topCount, 1);

  // ---- Width fit (per row) ----
  // Each reel's outer frame footprint is SYMBOL_SIZE * FRAME_W_FACTOR wide.
  // Budget: frame margins (8) + frame side padding (16) + reel gaps (12 per gap).
  const widthChrome = 8 * 2 + 16 + Math.max(0, widestRow - 1) * 12;
  const widthAvailable = screenW - widthChrome;
  const widthFrameOuter = widthAvailable / widestRow;
  const widthSymbolSize = widthFrameOuter / FRAME_W_FACTOR;

  // ---- Height fit (two rows of 3-row reels with ornate frame) ----
  const heightAvailable = screenH - 130 - 180 - 32 - 14;
  // 2 reel rows × outer frame height; outer = SYMBOL_SIZE * 3 * FRAME_H_FACTOR.
  const heightSymbolSize = heightAvailable / (2 * 3 * FRAME_H_FACTOR);

  const fit = Math.min(widthSymbolSize, heightSymbolSize);
  // Cell sizing — frame outer ends up at 1.78× this width.
  // Cap raised to 96 now that the outer wood rack frame is removed and
  // each reel column has more breathing room.
  return Math.max(48, Math.min(96, Math.floor(fit)));
}

export default function DrawScreen() {
  const { numbers: numbersParam, intentions: intentionsParam } = useLocalSearchParams<{
    numbers: string;
    intentions: string;
  }>();

  // Ideal blessed numbers from the user's profile — the slot machine rolls
  // around these. With LUCK_FREE the user lands on each ideal slot ~40% of
  // the time; the rest come up random. Premium passes LUCK_PREMIUM=1.0.
  const idealNumbers: number[] = numbersParam ? JSON.parse(numbersParam) : [];
  const intentions: string[] = intentionsParam ? JSON.parse(intentionsParam) : [];

  const [premium, setPremium] = useState(false);
  const [spinsUsedToday, setSpinsUsedToday] = useState(0);
  // 'intro' is the brief loading flash on screen-mount (home → draw transition).
  // After it finishes we drop to 'idle' and SPIN can be tapped.
  const [stage, setStage] = useState<'intro' | 'idle' | 'countdown' | 'spinning' | 'landed'>('intro');
  const [countdownStep, setCountdownStep] = useState<number | null>(null);
  const [calloutText, setCalloutText] = useState<string | null>(null);
  // Latest spin outcome — overwritten each spin. saveTodayReading is called
  // on every landed spin so the user's most recent result is what /analysis
  // reads when they tap SAVE & READ.
  const [result, setResult] = useState<number[]>([]);
  const [hits, setHits] = useState<boolean[]>([]);
  // Per-reel landed state. We track this per-index instead of a count so a
  // partial respin (only miss reels) can put just those reels back into
  // "spinning" while leaving the hit reels frozen in place.
  const [landedFlags, setLandedFlags] = useState<boolean[]>([]);

  const reelRefs = useRef<Array<React.RefObject<SlotReelHandle | null>>>(
    idealNumbers.map(() => React.createRef<SlotReelHandle | null>())
  );
  const reelSize = computeReelSize(idealNumbers.length || 1);

  const countdownScale = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;
  const calloutOpacity = useRef(new Animated.Value(0)).current;
  const calloutScale = useRef(new Animated.Value(0.8)).current;
  const finaleAnim = useRef(new Animated.Value(0)).current;
  // Idle decoration: continuous coin spin + breathing CTA pulse.
  const coinSpin = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;
  // Screen-mount entry — rack drops in from above + fades in.
  const rackEntry = useRef(new Animated.Value(0)).current;
  // Coin-shower finale — N coin sprites burst from the rack centre on a
  // full-blessed landing. Each coin gets its own AnimatedValueXY so we can
  // randomise direction/distance.
  const COIN_COUNT = 14;
  const coinShower = useRef(
    Array.from({ length: COIN_COUNT }, () => ({
      pos: new Animated.ValueXY({ x: 0, y: 0 }),
      opacity: new Animated.Value(0),
      rot: new Animated.Value(0),
    })),
  ).current;

  const spinsLeft = premium ? Infinity : Math.max(0, FREE_SPINS_PER_DAY - spinsUsedToday);
  const canSpin = stage === 'idle' && (premium || spinsLeft > 0);
  const allLanded = landedFlags.length > 0 && landedFlags.every(Boolean);
  const allRevealed = stage === 'landed' && allLanded;
  const hitCount = hits.filter(Boolean).length;
  const missCount = hits.length - hitCount;
  const canRespinMisses = stage === 'landed' && missCount > 0 && (premium || spinsLeft > 0);

  // Fetch spin budget + premium each focus so the count stays in sync if
  // the user upgrades from the paywall and returns.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [used, prem] = await Promise.all([getTodayDrawCount(), isPremium()]);
        setSpinsUsedToday(used);
        setPremium(prem);
      })();
    }, [])
  );

  // Preload slot SFX on first focus; unload on unmount.
  useEffect(() => {
    void preloadSlotSounds();
    return () => { void unloadSlotSounds(); };
  }, []);

  // Drop the intro stage to idle after a beat so the rack mounts cleanly
  // a moment after first paint (avoids the heavy Image components blocking
  // the initial layout pass).
  useEffect(() => {
    if (stage !== 'intro') return;
    const t = setTimeout(() => setStage('idle'), 350);
    return () => clearTimeout(t);
  }, [stage]);

  // Idle animations — coin spinning forever (5.4s/rev), CTA breathing 1.0↔1.04.
  useEffect(() => {
    const coin = Animated.loop(
      Animated.timing(coinSpin, {
        toValue: 1, duration: 5400,
        easing: Easing.linear, useNativeDriver: true,
      }),
    );
    coin.start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1, duration: 900,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 0, duration: 900,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => {
      coin.stop();
      pulse.stop();
    };
  }, [coinSpin, ctaPulse]);

  // Rack entry — runs once after the loading flash finishes ('intro' → 'idle').
  useEffect(() => {
    if (stage !== 'idle') return;
    Animated.spring(rackEntry, {
      toValue: 1,
      damping: 11, mass: 1.1, stiffness: 110,
      useNativeDriver: true,
    }).start();
  }, [stage, rackEntry]);

  // Coin shower — fired when the finale lands on an all-blessed result.
  // Pre-randomised trajectories so each coin flies a different angle/length.
  function runCoinShower() {
    const animations = coinShower.map(coin => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 140 + Math.random() * 120;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + 80; // bias downward (gravity)
      coin.pos.setValue({ x: 0, y: 0 });
      coin.opacity.setValue(0);
      coin.rot.setValue(0);
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(coin.opacity, {
            toValue: 1, duration: 80, useNativeDriver: true,
          }),
          Animated.delay(700),
          Animated.timing(coin.opacity, {
            toValue: 0, duration: 320, useNativeDriver: true,
          }),
        ]),
        Animated.timing(coin.pos, {
          toValue: { x: dx, y: dy },
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(coin.rot, {
          toValue: Math.random() > 0.5 ? 2 : -2,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
    });
    Animated.stagger(50, animations).start();
  }

  function runCountdown(onDone: () => void) {
    const steps = [3, 2, 1];
    let i = 0;
    const showStep = () => {
      if (i >= steps.length) {
        setCountdownStep(null);
        onDone();
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

  function handleSpin() {
    if (!canSpin) {
      if (!premium && spinsLeft <= 0) {
        track('paywall_reached', { source: 'draw_out_of_spins' });
        router.push('/paywall');
      }
      return;
    }
    // Roll the slot outcome BEFORE spinning so each reel knows where to land.
    const rolled = applyLuck(idealNumbers, premium ? LUCK_PREMIUM : LUCK_FREE);
    setResult(rolled.numbers);
    setHits(rolled.hits);
    setLandedFlags(idealNumbers.map(() => false));
    finaleAnim.setValue(0);
    void playSound('button');
    track('spin_started', {
      premium, hitsExpected: idealNumbers.length,
      spinsLeftBefore: spinsLeft === Infinity ? -1 : spinsLeft,
    });
    // Loading flash already played on screen entry — go straight to the
    // 3-2-1 countdown.
    startCountdownAndSpin(rolled);
  }

  // Sequence reel stops with stagger. `indices` is the ordered list of reel
  // positions to stop (initial spin = all; respin = misses only). For each
  // landing we update landedFlags[i], play the stop sound, fire a callout,
  // and on the last landing run the finale + persist the new result.
  function runStopSequence(rolled: { numbers: number[]; hits: boolean[] }, indices: number[]) {
    if (indices.length === 0) {
      setStage('landed');
      return;
    }
    const stopAt = (k: number) => {
      if (k >= indices.length) return;
      const i = indices[k];
      const ref = reelRefs.current[i];
      ref.current?.stop(rolled.numbers[i]).then(() => {
        void playSound('reelStop');
        showCallout(rolled.hits[i] ? `★ ${rolled.numbers[i]}` : `${rolled.numbers[i]}`);
        setLandedFlags(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        const isLast = k === indices.length - 1;
        if (isLast) {
          void stopSound('reelsSpin');
          const allHits = rolled.hits.every(Boolean);
          void playSound(allHits ? 'win' : 'bonusLand');
          Vibration.vibrate([0, 60, 80, 60]);
          Animated.spring(finaleAnim, {
            toValue: 1, damping: 8, mass: 1, stiffness: 130,
            useNativeDriver: true,
          }).start();
          if (allHits) runCoinShower();
          setStage('landed');
          (async () => {
            await incrementTodayDrawCount();
            await saveTodayReading(rolled.numbers, intentions);
            setSpinsUsedToday(s => s + 1);
            track('spin_landed', {
              hits: rolled.hits.filter(Boolean).length,
              total: rolled.numbers.length,
              premium,
            });
          })();
        }
      });
      setTimeout(() => stopAt(k + 1), STAGGER_MS);
    };
    stopAt(0);
  }

  function startCountdownAndSpin(rolled: { numbers: number[]; hits: boolean[] }) {
    setStage('countdown');

    runCountdown(() => {
      setStage('spinning');
      const allIndices = rolled.numbers.map((_, i) => i);
      setTimeout(() => {
        allIndices.forEach(i => reelRefs.current[i].current?.spin());
        void playSound('reelsSpin', { loop: true });
      }, PRE_SPIN_DELAY);
      setTimeout(() => {
        runStopSequence(rolled, allIndices);
      }, PRE_SPIN_DELAY + SPIN_BEFORE_FIRST_STOP);
    });
  }

  // Respin only the reels that didn't land on the user's blessed number.
  // Hit reels stay frozen in place — we don't call spin/stop on them. The
  // user is gambling specifically on the misses landing better this round,
  // so we don't redo the loading flash + 3-2-1 countdown either; respins
  // are quick & focused.
  function handleRespinMisses() {
    if (!canRespinMisses) {
      if (!premium && spinsLeft <= 0) {
        track('paywall_reached', { source: 'draw_spin_again' });
        router.push('/paywall');
      }
      return;
    }
    const missIndices = hits.map((h, i) => h ? -1 : i).filter(i => i >= 0);
    if (missIndices.length === 0) return;

    // Fresh roll across all positions, but we only adopt the values at
    // miss indices. Hit indices keep their previous value/hit state.
    const reroll = applyLuck(idealNumbers, premium ? LUCK_PREMIUM : LUCK_FREE);
    const newResult = result.map((v, i) => hits[i] ? v : reroll.numbers[i]);
    const newHits = hits.map((h, i) => h ? h : reroll.hits[i]);

    setResult(newResult);
    setHits(newHits);
    setLandedFlags(prev => prev.map((flag, i) => hits[i] ? flag : false));
    finaleAnim.setValue(0);
    void playSound('button');
    setStage('spinning');
    track('spin_started', {
      premium, hitsExpected: missIndices.length,
      spinsLeftBefore: spinsLeft === Infinity ? -1 : spinsLeft,
    });

    setTimeout(() => {
      missIndices.forEach(i => reelRefs.current[i].current?.spin());
      void playSound('reelsSpin', { loop: true });
    }, 120);
    setTimeout(() => {
      runStopSequence({ numbers: newResult, hits: newHits }, missIndices);
    }, 120 + SPIN_BEFORE_FIRST_STOP);
  }

  function handleSaveAndRead() {
    track('reading_saved', { hits: hitCount, total: result.length, premium });
    router.replace({
      pathname: '/analysis',
      params: {
        numbers: JSON.stringify(result),
        intentions: intentionsParam ?? '[]',
      },
    });
  }

  const [topCount, bottomCount] = splitRows(idealNumbers.length || 1);
  const renderReel = (i: number) => {
    const landed = !!landedFlags[i];
    const isHit = landed && hits[i];
    // Idle reels display the user's blessed number for that slot so the
    // grid is meaningful even before they tap SPIN.
    const idealForSlot = idealNumbers[i] ?? 1;
    return (
      <View key={i} style={styles.reelColumn}>
        <SlotReel
          ref={reelRefs.current[i]}
          initialTarget={idealForSlot}
          size={reelSize}
        />
        <View style={[
          styles.reelDot,
          landed && (isHit ? styles.reelDotHit : styles.reelDotMiss),
        ]} />
      </View>
    );
  };

  return (
    <ImageBackground source={SLOT_ASSETS.bg} style={styles.root} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        {/* Minimal header — just the spins-left chip. */}
        <View style={styles.header}>
          <View style={styles.spinsTagWrap}>
            <Image
              source={SLOT_ASSETS.labelSpinsLeft}
              style={styles.spinsTagBg}
              resizeMode="contain"
            />
            {!premium && (
              <AppText style={styles.spinsTagCount}>
                {spinsLeft === Infinity ? '∞' : String(spinsLeft)}
              </AppText>
            )}
          </View>
        </View>

        {/* Reel rack — wrapped in the ornate wood reelFrame from MFA. Reels
            are split across TWO rows so each can be larger:
              5 reels → 3 / 2,  6 reels → 3 / 3.
            win_bg.png radiates behind the rack when all numbers are blessed. */}
        <View style={styles.reelStage}>
          {allRevealed && hits.every(Boolean) && (
            <Animated.Image
              source={SLOT_ASSETS.winBg}
              style={[
                styles.winHalo,
                {
                  opacity: finaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
                  transform: [{ scale: finaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.05] }) }],
                },
              ]}
              resizeMode="contain"
            />
          )}
          {/* Defer mounting reels until after the loading flash so the
              heavy 28×N Image components don't block first paint. */}
          {stage !== 'intro' && (
            <Animated.View style={{
              opacity: rackEntry,
              transform: [
                { translateY: rackEntry.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
                { scale: rackEntry.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              ],
            }}>
            <ImageBackground
              source={SLOT_ASSETS.reelFrame}
              style={styles.reelRackFrame}
              imageStyle={styles.reelRackFrameImage}
              resizeMode="stretch"
            >
              <View style={styles.reelRack}>
                <View style={styles.reelRow}>
                  {Array.from({ length: topCount }, (_, i) => renderReel(i))}
                </View>
                {bottomCount > 0 && (
                  <View style={styles.reelRow}>
                    {Array.from({ length: bottomCount }, (_, j) => renderReel(topCount + j))}
                  </View>
                )}
              </View>
            </ImageBackground>
            </Animated.View>
          )}

          {/* Coin shower — bursts from rack centre on full-blessed finale. */}
          {coinShower.map((coin, i) => (
            <Animated.View
              key={`coin-${i}`}
              pointerEvents="none"
              style={[styles.coinParticle, {
                opacity: coin.opacity,
                transform: [
                  { translateX: coin.pos.x },
                  { translateY: coin.pos.y },
                  { rotate: coin.rot.interpolate({
                      inputRange: [-2, 2], outputRange: ['-720deg', '720deg'],
                    }) },
                ],
              }]}
            >
              <Image source={SLOT_ASSETS.coinFu} style={styles.coinParticleImg} resizeMode="contain" />
            </Animated.View>
          ))}
        </View>

        {/* Intro stage exists only to defer the heavy reel-rack mount.
            The home screen already shows the LoadingFlash during navigation,
            so we don't render another flash here — just a short timer to
            transition to 'idle'. */}

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

        {/* Footer — wood ticker bar shows live state. Beneath it: the
            primary action button rotates between SPIN / SPIN AGAIN / SAVE &
            READ depending on stage. Mirrors the bottomFrame layout from
            MFA's createReels(). */}
        <View style={styles.footer}>
          <View style={styles.tickerStage}>
            {stage === 'spinning' || stage === 'countdown' ? (
              <View style={styles.tickerStateRow}>
                <Image source={SLOT_ASSETS.labelSpinning} style={styles.tickerLabel} resizeMode="contain" />
                <AppText style={styles.progress}>
                  {landedFlags.filter(Boolean).length} / {idealNumbers.length}
                </AppText>
              </View>
            ) : stage === 'landed' ? (
              <Animated.View
                style={[styles.tickerStateRow, {
                  opacity: finaleAnim,
                  transform: [{ scale: finaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                }]}
              >
                <AppText style={styles.finaleText}>
                  {hitCount} / {result.length}
                </AppText>
                <Image source={SLOT_ASSETS.labelBlessed} style={styles.tickerLabel} resizeMode="contain" />
              </Animated.View>
            ) : (
              <Image source={SLOT_ASSETS.labelReady} style={styles.tickerLabel} resizeMode="contain" />
            )}
          </View>

          {/* Primary action — varies by stage. Buttons are now PNGs so the
              ornate gold typography never wraps or overflows. */}
          {stage === 'idle' ? (
            <Animated.View style={{
              transform: [{ scale: ctaPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
            }}>
              <TouchableOpacity
                onPress={handleSpin}
                disabled={!canSpin}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={styles.imageCtaWrap}
              >
                <Image
                  source={canSpin ? SLOT_ASSETS.ctaSpin : SLOT_ASSETS.labelOutOfSpins}
                  style={styles.imageCta}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </Animated.View>
          ) : allRevealed ? (
            <View style={styles.landedActions}>
              {missCount > 0 && (premium || spinsLeft > 0) && (
                <TouchableOpacity
                  onPress={handleRespinMisses}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={styles.imageCtaWrap}
                >
                  <View>
                    <Image
                      source={SLOT_ASSETS.ctaRespin}
                      style={styles.imageCta}
                      resizeMode="contain"
                    />
                    <View pointerEvents="none" style={styles.respinCountChip}>
                      <AppText style={styles.respinCountText}>{missCount}</AppText>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSaveAndRead}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={styles.imageCtaWrap}
              >
                <Image
                  source={SLOT_ASSETS.ctaSaveRead}
                  style={styles.imageCta}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.imageCtaWrap, { opacity: 0.55 }]}>
              <Image
                source={SLOT_ASSETS.labelSpinning}
                style={styles.imageCta}
                resizeMode="contain"
              />
            </View>
          )}

          <AppText style={styles.disclaimer}>
            {premium ? 'Every spin lands on your blessed numbers' : Strings.draw.luckHint}
          </AppText>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const READ_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1.5 },
  textShadowRadius: 4,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1, justifyContent: 'space-between' },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: 0,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 56,
    marginBottom: 0,
  },
  // SPINS LEFT TODAY label PNG with a small numeric overlay on top.
  spinsTagWrap: {
    width: 240,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 2,
  },
  spinsTagBg: {
    width: '100%',
    height: '100%',
  },
  spinsTagCount: {
    position: 'absolute',
    right: 26,
    top: 12,
    fontFamily: 'Cinzel_800ExtraBold',
    fontSize: 18, color: '#FFE082',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Spinning fu coin — sits to the upper-right above the rack.
  coinFloat: {
    position: 'absolute',
    top: 60, right: 18,
    width: 56, height: 56,
    zIndex: 5,
  },
  coin: {
    width: '100%', height: '100%',
  },
  // Coin-shower particle — fired on full-blessed finale.
  coinParticle: {
    position: 'absolute',
    top: '50%', left: '50%',
    marginLeft: -22, marginTop: -22,
    width: 44, height: 44,
    zIndex: 30,
  },
  coinParticleImg: {
    width: '100%', height: '100%',
  },

  // Stage hosts the win halo + reel frame; the halo sits behind everything.
  // flex:1 lets the rack absorb the available vertical space between the
  // header and footer, so the spin button is always on screen.
  reelStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  winHalo: {
    position: 'absolute',
    width: '120%',
    height: '160%',
    zIndex: 0,
  },
  // Reel rack now sits inside the ornate wood reelFrame.png. The image
  // stretches to fit the rack box; we add inner padding so the spinning
  // reels sit in the frame's interior cavity rather than over its border.
  reelRackFrame: {
    marginHorizontal: Spacing.sm,
    marginVertical: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center', justifyContent: 'center',
  },
  reelRackFrameImage: {
    borderRadius: Radius.md,
  },
  reelRack: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  // Wider gap so each reel reads as its own distinct column on the rack.
  reelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  reelColumn: {
    alignItems: 'center',
    gap: 4,
  },
  reelDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
    marginTop: 2,
  },
  // Hit = the reel landed on the user's actual blessed number for this slot.
  // Miss = a random number filled in; rendered red so the luck score is
  // legible at a glance ("which slots blessed me?").
  reelDotHit: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  reelDotMiss: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  reelIndex: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 11, letterSpacing: 1.5, color: Colors.gold,
    ...READ_SHADOW,
  },

  // Countdown
  countdownOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 50,
  },
  countdownText: {
    fontFamily: 'Lora_700Bold',
    fontSize: 200, fontWeight: '900',
    color: Colors.gold, letterSpacing: -8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },

  callout: {
    position: 'absolute',
    top: '50%', alignSelf: 'center',
    paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.gold,
    borderRadius: Radius.sm,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    zIndex: 40,
  },
  calloutText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 18, fontWeight: '900', letterSpacing: 0.5, color: Colors.gold,
  },

  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    gap: 6,
  },
  // Ticker stage — replaces the wood-frame backing. Shows label PNGs
  // (READY / SPINNING / BLESSED) and the running count.
  tickerStage: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tickerStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  tickerLabel: {
    width: 220,
    height: 48,
  },
  progress: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16, letterSpacing: 2, color: Colors.gold,
    textAlign: 'center',
    ...READ_SHADOW,
  },
  finaleText: {
    fontFamily: 'Cinzel_800ExtraBold',
    fontSize: 18, letterSpacing: 2,
    color: Colors.gold, textAlign: 'center',
    ...READ_SHADOW,
  },
  // PNG-backed CTA buttons — the artwork carries all the chrome, label,
  // and shadow so we don't add additional borders/backgrounds in RN.
  imageCtaWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCta: {
    width: '100%',
    height: 64,
  },
  // Small "respin count" pip overlaid on the RESPIN MISSES button.
  respinCountChip: {
    position: 'absolute',
    top: 8, right: 18,
    minWidth: 28, height: 28, borderRadius: 14,
    paddingHorizontal: 6,
    backgroundColor: '#0D0D12',
    borderWidth: 2, borderColor: '#FFD24F',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FFD24F', shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 6,
  },
  respinCountText: {
    fontFamily: 'Cinzel_800ExtraBold',
    fontSize: 14, color: '#FFD24F',
    includeFontPadding: false,
  },
  landedActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  disclaimer: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 12, color: Colors.cream,
    textAlign: 'center', fontStyle: 'italic', marginTop: 4,
    ...READ_SHADOW,
  },
});
