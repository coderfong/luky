import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'warm' | 'gold';
  padded?: boolean;
}

export function Card({
  children,
  variant = 'default',
  padded = true,
  style,
  ...props
}: CardProps) {
  return (
    <View
      style={[styles.base, styles[variant], padded && styles.padded, Shadow.card, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
  },
  padded: {
    padding: Spacing.lg,
  },
  default: {
    backgroundColor: Colors.surface,
  },
  warm: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gold: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
});
