import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Constants from 'expo-constants';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { Strings } from '../constants/strings';
import { useTextSize } from '../contexts/TextSizeContext';
import { TextSizePreference } from '../lib/storage';

const TEXT_SIZE_OPTIONS: { value: TextSizePreference; label: string }[] = [
  { value: 'standard', label: Strings.settings.textSizeSmall },
  { value: 'large', label: Strings.settings.textSizeMedium },
  { value: 'xlarge', label: Strings.settings.textSizeLarge },
];

export default function SettingsScreen() {
  const { textSize, setTextSize } = useTextSize();
  const version = Constants.expoConfig?.version ?? '1.0';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Text size */}
          <AppText variant="label" style={styles.sectionLabel}>
            {Strings.settings.textSizeSection}
          </AppText>
          <Card variant="warm" style={styles.card}>
            <View style={styles.sizeRow}>
              {TEXT_SIZE_OPTIONS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.sizeBtn, textSize === value && styles.sizeBtnActive]}
                  onPress={() => setTextSize(value)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: textSize === value }}
                >
                  <AppText
                    style={[
                      styles.sizeBtnLabel,
                      textSize === value && styles.sizeBtnLabelActive,
                    ]}
                  >
                    {label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            <AppText variant="caption" style={styles.sizeHint}>
              Applies to all text in the app.
            </AppText>
          </Card>

          {/* About */}
          <AppText variant="label" style={styles.sectionLabel}>
            {Strings.settings.aboutSection}
          </AppText>
          <Card variant="warm" style={styles.card}>
            <AppText variant="subheading" style={styles.aboutTitle}>
              {Strings.settings.aboutTitle}
            </AppText>
            <AppText variant="body" style={styles.aboutBody}>
              {Strings.settings.aboutBody}
            </AppText>
            <AppText variant="caption" style={styles.version}>
              {Strings.settings.versionLabel} {version}
            </AppText>
          </Card>

          {/* Disclaimer */}
          <AppText variant="label" style={styles.sectionLabel}>
            Legal
          </AppText>
          <Card variant="warm" padded={false}>
            <SettingsRow label={Strings.settings.disclaimerTitle} />
            <View style={styles.rowDivider} />
            <SettingsRow label={Strings.settings.privacyTitle} last />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SettingsRow({ label, last }: { label: string; last?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.settingsRow, last && styles.settingsRowLast]}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <AppText variant="body" style={styles.settingsRowLabel}>
        {label}
      </AppText>
      <AppText style={styles.chevron}>›</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  sectionLabel: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  card: {
    marginBottom: Spacing.xs,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sizeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  sizeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  sizeBtnLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.sizeSM,
    color: Colors.textSecondary,
  },
  sizeBtnLabelActive: {
    color: Colors.textOnPrimary,
  },
  sizeHint: {
    color: Colors.textMuted,
  },
  aboutTitle: {
    marginBottom: Spacing.sm,
    color: Colors.primary,
  },
  aboutBody: {
    color: Colors.textSecondary,
    lineHeight: Typography.sizeBase * 1.7,
    marginBottom: Spacing.sm,
  },
  version: {
    color: Colors.textMuted,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.md,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingsRowLast: {},
  settingsRowLabel: {
    color: Colors.textPrimary,
  },
  chevron: {
    fontSize: 22,
    color: Colors.textMuted,
    fontFamily: Typography.fontBody,
  },
});
