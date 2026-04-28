import React, { useEffect, useMemo, useRef } from 'react';
import {
  View, StyleSheet, SafeAreaView, TouchableOpacity,
  Animated, Easing, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '../../components/ui/AppText';
import { NumberBall } from '../../components/NumberBall';
import { DisclaimerBanner } from '../../components/DisclaimerBanner';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';
import { Strings } from '../../constants/strings';
import { getProfile } from '../../lib/storage';
import {
  deriveFromProfile, getDailyExtras, getDailyFeaturedNumbers,
} from '../../lib/numbers';
import { track } from '../../lib/analytics';

const { width: SCREEN_W } = Dimensions.get('window');

// First-time emotional preview. Sits between the disclaimer and the home
// screen so a brand-new user lands on something personal in <30 seconds
// instead of a generic dashboard. The CTA derives the user's six numbers and
// pushes the existing /draw flow — no parallel data path.

export default function FirstReadingScreen() {
  const [name, setName] = React.useState('');
  const [previewNumbers, setPreviewNumbers] = React.useState<number[]>([]);
  const [intentions] = React.useState<('blessing')[]>(['blessing']);
  const dailyExtras = useMemo(() => getDailyExtras(), []);

  useEffect(() => {
    track('first_reading_started');
    (async () => {
      const profile = await getProfile();
      if (!profile) {
        // Shouldn't happen — profile is required to reach this screen — but
        // fall back to the daily featured numbers so we still preview something.
        setPreviewNumbers(getDailyFeaturedNumbers(6));
        return;
      }
      setName(profile.name.split(' ')[0] ?? 'Friend');
      setPreviewNumbers(
        deriveFromProfile(profile.birthdate, profile.name, intentions, 6, {
          zodiac: profile.zodiac,
          favouriteNumber: profile.favouriteNumber,
          avoidNumbers: profile.avoidNumbers,
          pantangMode: profile.pantangMode,
        })
      );
    })();
  }, [intentions]);

  // Floating + pulsing animation on the preview balls
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 700, easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1, duration: 2400,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0, duration: 2400,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ])
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1, duration: 1600,
          easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0, duration: 1600,
          easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
      ])
    );
    float.start();
    pulse.start();
    return () => { float.stop(); pulse.stop(); };
  }, [floatAnim, pulseAnim, fadeAnim]);

  const handleOpen = () => {
    if (previewNumbers.length === 0) return;
    track('first_reading_revealed', { count: previewNumbers.length });
    router.replace({
      pathname: '/draw',
      params: {
        numbers: JSON.stringify(previewNumbers),
        intentions: JSON.stringify(intentions),
      },
    });
  };

  const handleSkip = () => {
    track('first_reading_skipped');
    router.replace('/');
  };

  const S = Strings.onboarding.firstReading;
  const fadeStyle = {
    opacity: fadeAnim,
    transform: [{
      translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
    }],
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBand} />

        <Animated.View style={[styles.content, fadeStyle]}>
          <AppText style={styles.eyebrow}>{S.eyebrow}</AppText>
          <AppText variant="heading" style={styles.title}>
            {name ? S.title(name) : 'Your blessed numbers\nare waiting.'}
          </AppText>

          {/* Floating animated preview — 2x3 grid */}
          <View style={styles.ballsCard}>
            <View style={styles.ballsGrid}>
              {previewNumbers.map((n, i) => {
                // Each ball gets a slightly different float offset so the cluster breathes.
                const phase = (i % 6) / 6;
                const translateY = floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [phase * 4 - 2, -(phase * 4 - 2) - 4],
                });
                const scale = pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.05 + (i % 3) * 0.01],
                });
                const opacity = pulseAnim.interpolate({
                  inputRange: [0, 1], outputRange: [0.85, 1],
                });
                return (
                  <Animated.View
                    key={`${n}-${i}`}
                    style={[
                      styles.ballWrap,
                      { opacity, transform: [{ translateY }, { scale }] },
                    ]}
                  >
                    <NumberBall number={n} size={Math.min(72, (SCREEN_W - 96) / 3)} variant="red" />
                  </Animated.View>
                );
              })}
            </View>
          </View>

          <AppText style={styles.body}>{S.bodyA}</AppText>
          <AppText style={styles.body}>{S.bodyB}</AppText>

          <View style={styles.themeChip}>
            <AppText style={styles.themeLabel}>{S.themeLabel}</AppText>
            <AppText style={styles.themeValue}>{dailyExtras.theme}</AppText>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleOpen}
            style={[styles.cta, previewNumbers.length === 0 && styles.ctaDisabled]}
            disabled={previewNumbers.length === 0}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={S.cta}
          >
            <AppText style={styles.ctaLabel}>{S.cta}</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <AppText style={styles.skipLabel}>{S.skip}</AppText>
          </TouchableOpacity>
        </View>

        <DisclaimerBanner />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  topBand: { height: 6, backgroundColor: Colors.primary },

  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  eyebrow: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 3, color: Colors.gold,
    textAlign: 'center', marginBottom: 10,
  },
  title: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 30, fontWeight: '900', color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 38, letterSpacing: -0.5,
    marginBottom: Spacing.lg,
  },

  ballsCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.gold,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadow.elevated,
  },
  ballsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  ballWrap: { width: '30%', alignItems: 'center' },

  body: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 18, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 28,
    marginBottom: Spacing.sm,
  },

  themeChip: {
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 8,
    marginTop: Spacing.md,
  },
  themeLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 1.5, color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  themeValue: {
    fontFamily: 'Lora_700Bold', fontSize: 16, color: Colors.gold,
    letterSpacing: -0.2,
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm, paddingBottom: Spacing.xl,
  },
  cta: {
    backgroundColor: Colors.gold,
    paddingVertical: 22,
    borderRadius: Radius.lg,
    alignItems: 'center',
    ...Shadow.gold,
  },
  ctaDisabled: { opacity: 0.4, shadowOpacity: 0 },
  ctaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 20, fontWeight: '900', letterSpacing: 0.3,
    color: Colors.background,
  },
  skipBtn: { paddingVertical: Spacing.md, alignItems: 'center' },
  skipLabel: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 15, color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
