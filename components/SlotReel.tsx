import React, { useEffect, useImperativeHandle, useRef, forwardRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Vibration, Image, ImageBackground, ImageSourcePropType } from 'react-native';
import { Colors } from '../constants/theme';

// Per-reel outer frame — oriental dragon/lantern art with 3 internal slot
// windows that line up with our 3-row visible window. Stretched to fit each
// reel's display box.
const REEL_FRAME = require('../assets/ui/frame.png');
// The frame artwork is 1086×1448 (3:4 portrait). The painted ornament
// occupies the outer ~22% on each side and ~10% top/bottom; the central
// dark panel where slot windows live is roughly 56% × 80%. We size the
// frame so the inner cell column lands inside that central panel.
const FRAME_WIDTH_FACTOR = 1 / 0.56;   // outer width / cell width
const FRAME_HEIGHT_FACTOR = 1 / 0.80;  // outer height / inner content height

// Slot reel with the user's 49 oriental-casino number tiles. Each cell shows
// one full PNG (the number is baked into the tile artwork — no overlay).
// Mechanics still mirror MYSTICAL-FOREST-ADVENTURE/slot-game.js: vertical
// scroll with seamless head/tail wrap, then a 3-phase ease-out land into
// the middle row of a 3-row window (the payline).

// Static require map — RN's bundler needs a literal require() per asset.
const NUMBER_TILES: Record<number, ImageSourcePropType> = {
  1: require('../assets/mfa/numbers/1.png'),
  2: require('../assets/mfa/numbers/2.png'),
  3: require('../assets/mfa/numbers/3.png'),
  4: require('../assets/mfa/numbers/4.png'),
  5: require('../assets/mfa/numbers/5.png'),
  6: require('../assets/mfa/numbers/6.png'),
  7: require('../assets/mfa/numbers/7.png'),
  8: require('../assets/mfa/numbers/8.png'),
  9: require('../assets/mfa/numbers/9.png'),
  10: require('../assets/mfa/numbers/10.png'),
  11: require('../assets/mfa/numbers/11.png'),
  12: require('../assets/mfa/numbers/12.png'),
  13: require('../assets/mfa/numbers/13.png'),
  14: require('../assets/mfa/numbers/14.png'),
  15: require('../assets/mfa/numbers/15.png'),
  16: require('../assets/mfa/numbers/16.png'),
  17: require('../assets/mfa/numbers/17.png'),
  18: require('../assets/mfa/numbers/18.png'),
  19: require('../assets/mfa/numbers/19.png'),
  20: require('../assets/mfa/numbers/20.png'),
  21: require('../assets/mfa/numbers/21.png'),
  22: require('../assets/mfa/numbers/22.png'),
  23: require('../assets/mfa/numbers/23.png'),
  24: require('../assets/mfa/numbers/24.png'),
  25: require('../assets/mfa/numbers/25.png'),
  26: require('../assets/mfa/numbers/26.png'),
  27: require('../assets/mfa/numbers/27.png'),
  28: require('../assets/mfa/numbers/28.png'),
  29: require('../assets/mfa/numbers/29.png'),
  30: require('../assets/mfa/numbers/30.png'),
  31: require('../assets/mfa/numbers/31.png'),
  32: require('../assets/mfa/numbers/32.png'),
  33: require('../assets/mfa/numbers/33.png'),
  34: require('../assets/mfa/numbers/34.png'),
  35: require('../assets/mfa/numbers/35.png'),
  36: require('../assets/mfa/numbers/36.png'),
  37: require('../assets/mfa/numbers/37.png'),
  38: require('../assets/mfa/numbers/38.png'),
  39: require('../assets/mfa/numbers/39.png'),
  40: require('../assets/mfa/numbers/40.png'),
  41: require('../assets/mfa/numbers/41.png'),
  42: require('../assets/mfa/numbers/42.png'),
  43: require('../assets/mfa/numbers/43.png'),
  44: require('../assets/mfa/numbers/44.png'),
  45: require('../assets/mfa/numbers/45.png'),
  46: require('../assets/mfa/numbers/46.png'),
  47: require('../assets/mfa/numbers/47.png'),
  48: require('../assets/mfa/numbers/48.png'),
  49: require('../assets/mfa/numbers/49.png'),
};

const DEFAULT_SYMBOL_SIZE = 96;
// Tape kept short (10 cells × head+tail = 20 mounted Images per reel)
// to minimise initial paint cost. The wrap rate during spin is fast
// enough that the eye reads it as continuous motion.
const TAPE_LENGTH = 10;
const VISIBLE_ROWS = 3;

export interface SlotReelHandle {
  spin(): void;
  stop(target: number): Promise<void>;
}

interface SlotReelProps {
  initialTarget?: number;
  spinDurationMs?: number;
  frameColor?: string;
  /** Outer cell size in pt. Defaults to 96. */
  size?: number;
  /** test hook */
  testID?: string;
}

interface Cell {
  /** 1..49 — used as the index into NUMBER_TILES. */
  number: number;
}

function clamp(n: number) {
  return ((Math.abs(Math.floor(n)) % 49) + 1);
}

function buildTape(target: number, seed: number): Cell[] {
  const tape: Cell[] = [];
  let s = (seed * 1103515245 + 12345) >>> 0;
  for (let i = 0; i < TAPE_LENGTH - 1; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    tape.push({ number: (s % 49) + 1 });
  }
  // Target sits at LAST tape index — landY positions it on the middle row.
  tape.push({ number: clamp(target) });
  return tape;
}

export const SlotReel = forwardRef<SlotReelHandle, SlotReelProps>(function SlotReel(
  { initialTarget = 1, spinDurationMs = 280, frameColor = Colors.gold, size = DEFAULT_SYMBOL_SIZE },
  ref,
) {
  const [tape, setTape] = useState<Cell[]>(() => buildTape(initialTarget, initialTarget));
  // Start the reel positioned so the target tile sits on the middle (payline)
  // row from first paint, instead of showing random head-of-tape cells.
  // landY mirrors the formula in stop() below.
  const initialLandY = -((TAPE_LENGTH - 1) * size - size);
  const offsetY = useRef(new Animated.Value(initialLandY)).current;
  // Landing pulse — used to scale + glow the payline cell on stop.
  const landPulse = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const isSpinningRef = useRef(false);
  const seedRef = useRef<number>(initialTarget);

  useEffect(() => {
    return () => { loopRef.current?.stop(); };
  }, []);

  const SYMBOL_SIZE = size;
  const tapeHeight = TAPE_LENGTH * SYMBOL_SIZE;

  useImperativeHandle(ref, () => ({
    spin() {
      if (isSpinningRef.current) return;
      isSpinningRef.current = true;
      seedRef.current = (seedRef.current * 16807 + 1) >>> 0;
      setTape(buildTape(initialTarget, seedRef.current));
      offsetY.setValue(0);
      landPulse.setValue(0);

      const loop = Animated.loop(
        Animated.timing(offsetY, {
          toValue: -tapeHeight,
          duration: Math.max(220, spinDurationMs * TAPE_LENGTH / 6),
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        { resetBeforeIteration: true },
      );
      loopRef.current = loop;
      loop.start();
    },

    stop(target: number) {
      return new Promise<void>(resolve => {
        loopRef.current?.stop();
        seedRef.current = (seedRef.current * 16807 + target) >>> 0;
        setTape(buildTape(target, seedRef.current));

        // Target on the middle row — tape index TAPE_LENGTH-1 sits at offset
        // -((TAPE_LENGTH-1) * SYMBOL_SIZE), so we shift forward by ONE row
        // to push it down into the centre.
        const landY = -((TAPE_LENGTH - 1) * SYMBOL_SIZE - SYMBOL_SIZE);
        const overshootY = landY - tapeHeight;

        Animated.sequence([
          Animated.timing(offsetY, {
            toValue: overshootY,
            duration: 380,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(offsetY, {
            toValue: landY,
            duration: 560,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(offsetY, {
            toValue: landY,
            damping: 8, mass: 0.7, stiffness: 220,
            useNativeDriver: true,
          }),
        ]).start(() => {
          isSpinningRef.current = false;
          Vibration.vibrate(35);
          // Landing pulse: scale 1 → 1.18 → 1, with the gold glow ring fading
          // in then out. Reads as the tile "ringing" when it hits the payline.
          Animated.sequence([
            Animated.timing(landPulse, {
              toValue: 1, duration: 220,
              easing: Easing.out(Easing.back(1.4)),
              useNativeDriver: true,
            }),
            Animated.timing(landPulse, {
              toValue: 0, duration: 460,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start();
          resolve();
        });
      });
    },
  }), [offsetY, spinDurationMs, tapeHeight, initialTarget, landPulse]);

  const windowHeight = SYMBOL_SIZE * VISIBLE_ROWS;
  const frameOuterWidth = Math.round(SYMBOL_SIZE * FRAME_WIDTH_FACTOR);
  const frameOuterHeight = Math.round(windowHeight * FRAME_HEIGHT_FACTOR);
  const pulseScale = landPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const glowOpacity = landPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });
  const glowScale = landPulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.35] });

  // (frameColor unused now that frame.png provides its own border art —
  //  kept in props for backwards compat with any old callers.)
  void frameColor;

  return (
    <ImageBackground
      source={REEL_FRAME}
      style={[styles.frameOuter, { width: frameOuterWidth, height: frameOuterHeight }]}
      imageStyle={styles.frameImage}
      resizeMode="stretch"
    >
      <View style={[styles.window, { width: SYMBOL_SIZE, height: windowHeight }]}>
        <Animated.View style={{ transform: [{ translateY: offsetY }] }}>
          {tape.map((cell, i) => (
            <Cell key={`head-${i}`} cell={cell} size={SYMBOL_SIZE} />
          ))}
          {tape.map((cell, i) => (
            <Cell key={`tail-${i}`} cell={cell} size={SYMBOL_SIZE} />
          ))}
        </Animated.View>

        {/* Payline gold-glow halo, fades in/out on landing. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.paylineGlow, {
            top: SYMBOL_SIZE,
            height: SYMBOL_SIZE,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }]}
        />

        {/* Foreground "punch" tile that scales up briefly on landing. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.punchTile, {
            top: SYMBOL_SIZE,
            width: SYMBOL_SIZE,
            height: SYMBOL_SIZE,
            opacity: glowOpacity,
            transform: [{ scale: pulseScale }],
          }]}
        >
          <Image
            source={NUMBER_TILES[clamp(tape[tape.length - 1].number)]}
            style={{ width: SYMBOL_SIZE - 4, height: SYMBOL_SIZE - 4 }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </ImageBackground>
  );
});

function Cell({ cell, size }: { cell: Cell; size: number }) {
  return (
    <View style={[styles.cell, { width: size, height: size }]}>
      <Image
        source={NUMBER_TILES[clamp(cell.number)]}
        style={{ width: size - 4, height: size - 4 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Outer ornate frame — the dragon/lantern art with 3 internal slot windows.
  frameOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    // Drop shadow so the column lifts off the rack background.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  frameImage: {
    // Frame asset is transparent around its painted ornament — let it draw
    // free without a forced border-radius clip.
  },
  // Inner clipping window where the cell tape scrolls. Sits at the centre
  // of the frame, lining up with the 3 painted slot windows in the art.
  window: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    backgroundColor: 'rgba(8,4,4,0.55)',
    borderRadius: 4,
  },
  paylineGlow: {
    position: 'absolute',
    left: -4,
    right: -4,
    backgroundColor: 'rgba(255,210,80,0.35)',
    shadowColor: '#FFD24F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },
  punchTile: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function slotReelWidth(size = DEFAULT_SYMBOL_SIZE) {
  return Math.round(size * FRAME_WIDTH_FACTOR);
}
export function slotReelHeight(size = DEFAULT_SYMBOL_SIZE) {
  return Math.round(size * VISIBLE_ROWS * FRAME_HEIGHT_FACTOR);
}
export const SLOT_REEL_SIZE = slotReelWidth();
export { VISIBLE_ROWS };
