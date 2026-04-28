import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './ui/AppText';
import { Colors, Spacing } from '../constants/theme';
import { Strings } from '../constants/strings';

export function DisclaimerBanner() {
  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={Strings.disclaimer.short}
    >
      <View style={styles.accent} />
      <AppText variant="caption" style={styles.text}>
        {Strings.disclaimer.short}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accent: {
    width: 3,
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 20,
  },
  text: {
    flex: 1,
    textAlign: 'left',
    fontStyle: 'italic',
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
