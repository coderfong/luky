import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';
import { markOnboardingComplete } from '../../lib/storage';
import { track } from '../../lib/analytics';

export default function DisclaimerScreen() {
  const [accepted, setAccepted] = useState(false);

  const handleBegin = async () => {
    if (!accepted) return;
    await markOnboardingComplete();
    track('onboarding_completed');
    // Route into the emotional first-reading preview before the home screen.
    router.replace('/onboarding/first-reading');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBand} />

        <View style={styles.header}>
          <AppText variant="heading" style={styles.title}>
            Before You Begin
          </AppText>
          <AppText variant="body" style={styles.headerSub}>
            Please read and acknowledge the following.
          </AppText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Card variant="warm">
            <AppText variant="body" style={styles.disclaimerText}>
              {Strings.disclaimer.full}
            </AppText>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          {/* Checkbox row */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setAccepted((v) => !v)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            accessibilityLabel={Strings.disclaimer.acknowledgeLabel}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && (
                <AppText style={styles.checkmark}>✓</AppText>
              )}
            </View>
            <AppText variant="body" style={styles.checkLabel}>
              {Strings.disclaimer.acknowledgeLabel}
            </AppText>
          </TouchableOpacity>

          <Button
            label={Strings.disclaimer.button}
            onPress={handleBegin}
            disabled={!accepted}
            style={styles.cta}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  topBand: { height: 6, backgroundColor: Colors.primary },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  headerSub: {
    color: Colors.textSecondary,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  disclaimerText: {
    color: Colors.textPrimary,
    lineHeight: Typography.sizeBase * 1.75,
  },
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontFamily: Typography.fontBodyMedium,
  },
  checkLabel: {
    flex: 1,
    color: Colors.textPrimary,
    lineHeight: Typography.sizeBase * 1.5,
  },
  cta: { marginTop: Spacing.xs },
});
