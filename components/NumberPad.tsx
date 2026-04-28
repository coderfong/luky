import React from 'react';
import { View, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { AppText } from './ui/AppText';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

interface NumberPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const PAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
] as const;

export function NumberPad({ value, onChange, maxLength = 12 }: NumberPadProps) {
  const handleKey = (key: string) => {
    Vibration.vibrate(8);
    if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (key === '') {
      // no-op for empty cell
    } else if (value.length < maxLength) {
      onChange(value + key);
    }
  };

  return (
    <View style={styles.pad} accessibilityLabel="Number keypad">
      {PAD_KEYS.map((row, rIdx) => (
        <View key={rIdx} style={styles.row}>
          {row.map((key, kIdx) => (
            <TouchableOpacity
              key={kIdx}
              style={[styles.key, key === '' && styles.keyEmpty]}
              onPress={() => handleKey(key)}
              disabled={key === ''}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={key === '⌫' ? 'Delete' : key || undefined}
            >
              <AppText
                variant="subheading"
                style={[
                  styles.keyLabel,
                  key === '⌫' && styles.keyLabelDelete,
                  key === '' && styles.keyLabelHidden,
                ]}
              >
                {key}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const KEY_SIZE = 76;

const styles = StyleSheet.create({
  pad: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  keyLabel: {
    fontSize: Typography.sizeXL,
    color: Colors.textPrimary,
    fontFamily: Typography.fontBody,
  },
  keyLabelDelete: {
    fontSize: Typography.sizeLG,
    color: Colors.textSecondary,
  },
  keyLabelHidden: {
    opacity: 0,
  },
});
