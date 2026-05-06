import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Image, ImageBackground } from 'react-native';

// Brief pre-spin overlay reusing the MFA loading-screen art.
// Loading_bar_empty + Loading_bar_fill animate as a fill-from-left progress bar
// so the moment between tapping SPIN and the reels starting feels intentional.

const ASSETS = {
  bg: require('../assets/mfa/loading-screen/bg.png'),
  logo: require('../assets/mfa/loading-screen/game-logo.png'),
  loadingText: require('../assets/mfa/loading-screen/loading-text.png'),
  barEmpty: require('../assets/mfa/loading-screen/bar-empty.png'),
  barFill: require('../assets/mfa/loading-screen/bar-fill.png'),
};

const BAR_WIDTH = 280;
const BAR_HEIGHT = 32;

interface LoadingFlashProps {
  /** When true, the flash is visible. */
  visible: boolean;
  /** ms to fill the loading bar; defaults to 900. */
  durationMs?: number;
  /** Called once the bar has filled and the fade-out has started. */
  onDone?: () => void;
}

export function LoadingFlash({ visible, durationMs = 900, onDone }: LoadingFlashProps) {
  const fillProgress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      fillProgress.setValue(0);
      return;
    }
    fillProgress.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(fillProgress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // width interpolation
      }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      onDone?.();
    });
  }, [visible, durationMs, fillProgress, opacity, onDone]);

  if (!visible) return null;

  const fillWidth = fillProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_WIDTH],
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity }]}>
      <ImageBackground source={ASSETS.bg} style={styles.bg} resizeMode="cover">
        <View style={styles.center}>
          <Image source={ASSETS.logo} style={styles.logo} resizeMode="contain" />
          <Image source={ASSETS.loadingText} style={styles.loadingText} resizeMode="contain" />
          <View style={styles.barWrap}>
            <Image source={ASSETS.barEmpty} style={styles.barEmpty} resizeMode="stretch" />
            <Animated.View style={[styles.barFillClip, { width: fillWidth }]}>
              <Image source={ASSETS.barFill} style={styles.barFill} resizeMode="stretch" />
            </Animated.View>
          </View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: '#000',
  },
  bg: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  logo: { width: 280, height: 140 },
  loadingText: { width: 220, height: 40 },
  barWrap: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    position: 'relative',
  },
  barEmpty: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  barFillClip: {
    height: BAR_HEIGHT,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  barFill: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
  },
});
