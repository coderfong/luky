import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';
import { useTextSize } from '../../contexts/TextSizeContext';

export type TextVariant = 'heading' | 'subheading' | 'body' | 'bodyMedium' | 'caption' | 'label' | 'number';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
}

export function AppText({ variant = 'body', color, style, ...props }: AppTextProps) {
  const { scale } = useTextSize();

  const variantStyle = styles[variant];
  const scaledStyle =
    'fontSize' in variantStyle
      ? { fontSize: (variantStyle.fontSize as number) * scale }
      : {};

  return (
    <Text
      style={[variantStyle, scaledStyle, color ? { color } : undefined, style]}
      allowFontScaling={false}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.sizeXL,
    lineHeight: Typography.sizeXL * 1.3,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subheading: {
    fontFamily: Typography.fontHeadingMedium,
    fontSize: Typography.sizeLG,
    lineHeight: Typography.sizeLG * 1.35,
    color: Colors.textPrimary,
  },
  body: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.sizeBase,
    lineHeight: Typography.sizeBase * 1.65,
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.sizeBase,
    lineHeight: Typography.sizeBase * 1.65,
    color: Colors.textPrimary,
  },
  caption: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.sizeSM,
    lineHeight: Typography.sizeSM * 1.5,
    color: Colors.textSecondary,
  },
  label: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.sizeSM,
    lineHeight: Typography.sizeSM * 1.4,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  number: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size3XL,
    lineHeight: Typography.size3XL * 1.1,
    color: Colors.primary,
    letterSpacing: 2,
  },
});
