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

  // Flatten any inline override (style prop wins) and apply the user's text-size
  // multiplier to whichever fontSize ends up winning. Without this step, an
  // inline `fontSize: 12` would silently bypass the accessibility setting and
  // stay tiny on "Large" / "Extra Large" — that's a hard miss for a 55–80
  // audience. We also enforce a 14pt floor so micro-labels still read.
  const flat = StyleSheet.flatten([variantStyle, style]) ?? {};
  const baseFs =
    typeof flat.fontSize === 'number'
      ? flat.fontSize
      : (variantStyle.fontSize as number);
  const minFs = Math.max(14, baseFs); // floor for readability
  const scaledFs = minFs * scale;
  const baseLh = typeof flat.lineHeight === 'number' ? flat.lineHeight : null;
  const scaledLh = baseLh != null
    ? baseLh * (scaledFs / baseFs)
    : Math.round(scaledFs * 1.4);

  return (
    <Text
      style={[
        variantStyle,
        style,
        { fontSize: scaledFs, lineHeight: scaledLh },
        color ? { color } : undefined,
      ]}
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
