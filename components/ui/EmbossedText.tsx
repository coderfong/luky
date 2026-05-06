import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTextSize } from '../../contexts/TextSizeContext';

// React Native has no gradient-text support and only one textShadow per Text,
// so the embossed look is a two-layer stack:
//   1. a dark "drop shadow" Text positioned absolutely behind, offset down/right
//   2. a main Text on top whose textShadow paints a 1px highlight on the
//      TOP edge (offset up by 1, no blur) — that's what reads as a bevel.

type Variant = 'cta' | 'ctaSecondary' | 'count' | 'time' | 'cn';

interface Props {
  variant: Variant;
  children: React.ReactNode;
  fontSize?: number;
  letterSpacing?: number;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  numberOfLines?: number;
}

const VARIANTS: Record<Variant, {
  family: string;
  size: number;
  letterSpacing: number;
  fill: string;
  highlight: string;
  shadow: string;
}> = {
  cta: {
    family: 'Cinzel_800ExtraBold',
    size: 20,
    letterSpacing: 1.4,
    fill: Colors.maroon,
    highlight: Colors.cream,
    shadow: Colors.brownDeep,
  },
  ctaSecondary: {
    family: 'Cinzel_800ExtraBold',
    size: 20,
    letterSpacing: 1.4,
    fill: Colors.cream,
    highlight: Colors.gold,
    shadow: Colors.brownDeep,
  },
  count: {
    family: 'Teko_700Bold',
    size: 32,
    letterSpacing: 0.5,
    fill: Colors.cream,
    highlight: Colors.goldHighlight,
    shadow: '#3A0A05',
  },
  time: {
    family: 'Teko_700Bold',
    size: 28,
    letterSpacing: 0.5,
    fill: Colors.gold,
    highlight: Colors.goldHighlight,
    shadow: Colors.brownDeep,
  },
  cn: {
    family: 'NotoSerifSC_700Bold',
    size: 30,
    letterSpacing: 2,
    fill: Colors.gold,
    highlight: Colors.goldHighlight,
    shadow: Colors.maroon,
  },
};

export function EmbossedText({
  variant, children, fontSize, letterSpacing,
  style, containerStyle, numberOfLines,
}: Props) {
  const v = VARIANTS[variant];
  const { scale } = useTextSize();
  const fs = (fontSize ?? v.size) * scale;

  const baseStyle: TextStyle = {
    fontFamily: v.family,
    fontSize: fs,
    letterSpacing: letterSpacing ?? v.letterSpacing,
    textAlign: 'center',
  };

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, containerStyle]}>
      {/* Drop-shadow layer (sits behind, offset down-right) */}
      <Text
        allowFontScaling={false}
        numberOfLines={numberOfLines}
        style={[
          baseStyle,
          {
            color: v.shadow,
            position: 'absolute',
            top: 2,
            opacity: 0.9,
          },
          style,
        ]}
      >
        {children}
      </Text>
      {/* Main fill + 1px highlight on top edge */}
      <Text
        allowFontScaling={false}
        numberOfLines={numberOfLines}
        style={[
          baseStyle,
          {
            color: v.fill,
            textShadowColor: v.highlight,
            textShadowOffset: { width: 0, height: -1 },
            textShadowRadius: 0,
          },
          style,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}
