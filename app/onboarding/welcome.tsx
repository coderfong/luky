import React from 'react';
import { View, StyleSheet, Image, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';

const FEATURES = [
  Strings.onboarding.welcome.feature1,
  Strings.onboarding.welcome.feature2,
  Strings.onboarding.welcome.feature3,
] as const;

export default function WelcomeScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Decorative top band */}
        <View style={styles.topBand} />

        <View style={styles.content}>
          {/* Logo / icon area */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <AppText style={styles.logoEmoji}>卍</AppText>
            </View>
          </View>

          {/* Heading */}
          <AppText variant="heading" style={styles.title}>
            {Strings.onboarding.welcome.title}
          </AppText>
          <AppText variant="body" style={styles.subtitle}>
            {Strings.onboarding.welcome.subtitle}
          </AppText>

          {/* Feature list */}
          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureDot} />
                <AppText variant="body" style={styles.featureText}>
                  {f}
                </AppText>
              </View>
            ))}
          </View>

          <AppText variant="caption" style={styles.adultsNote}>
            For adults 18+ · Cultural reflection only — not gambling, prediction, or financial advice.
          </AppText>
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <Button
            label={Strings.onboarding.welcome.cta}
            onPress={() => router.push('/onboarding/profile')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  topBand: {
    height: 6,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  logoArea: {
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  logoEmoji: {
    fontSize: 44,
    color: Colors.gold,
    fontFamily: Typography.fontHeading,
  },
  title: {
    textAlign: 'center',
    fontSize: Typography.size2XL,
    marginBottom: Spacing.md,
    lineHeight: Typography.size2XL * 1.25,
    color: Colors.primary,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: Typography.sizeBase * 1.7,
  },
  features: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    marginTop: 8,
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    color: Colors.textPrimary,
  },
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  adultsNote: {
    marginTop: Spacing.xl,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
});
