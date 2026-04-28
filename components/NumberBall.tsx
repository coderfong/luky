import React from 'react';
import { View, Text, ViewStyle } from 'react-native';

export type BallVariant = 'red' | 'gold' | 'ghost' | 'dark';

interface NumberBallProps {
  number: number;
  size?: number;
  variant?: BallVariant;
  style?: ViewStyle;
  dimmed?: boolean;
}

const BALL_COLORS: Record<BallVariant, { main: string; deep: string; mid: string; text: string }> = {
  red:   { main: '#E63946', deep: '#8B1A24', mid: '#C42030', text: '#FFFFFF' },
  gold:  { main: '#F4C430', deep: '#9A7010', mid: '#D4A319', text: '#0D0D12' },
  ghost: { main: '#2A2A38', deep: '#14141C', mid: '#1E1E28', text: '#55556A' },
  dark:  { main: '#3A3A4A', deep: '#1A1A28', mid: '#2A2A38', text: '#8A8AA0' },
};

export function NumberBall({ number, size = 56, variant = 'red', style, dimmed }: NumberBallProps) {
  const c = BALL_COLORS[variant];
  const fontSize = size <= 30 ? size * 0.44 : size <= 50 ? size * 0.40 : size * 0.38;

  return (
    <View
      style={[{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.main,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: dimmed ? 0.35 : 1,
        shadowColor: variant === 'gold' ? '#F4C430' : '#000',
        shadowOffset: { width: 0, height: size * 0.07 },
        shadowOpacity: variant === 'ghost' ? 0.2 : 0.45,
        shadowRadius: size * 0.22,
        elevation: variant === 'ghost' ? 1 : 5,
      }, style]}
    >
      {/* Bottom dark rim — simulates radial gradient depth */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: size * 0.45,
          borderBottomLeftRadius: size / 2,
          borderBottomRightRadius: size / 2,
          backgroundColor: c.deep,
          opacity: 0.55,
        }}
      />
      {/* Mid band */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: size * 0.2,
          left: 0,
          right: 0,
          height: size * 0.25,
          backgroundColor: c.mid,
          opacity: 0.35,
        }}
      />
      {/* Specular highlight */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: size * 0.1,
          left: size * 0.17,
          width: size * 0.3,
          height: size * 0.18,
          borderRadius: size * 0.09,
          backgroundColor: 'rgba(255,255,255,0.58)',
          transform: [{ rotate: '-20deg' }],
        }}
      />
      <Text
        style={{
          fontSize,
          fontWeight: '800',
          color: c.text,
          letterSpacing: -0.5,
          includeFontPadding: false,
          textShadowColor: 'rgba(0,0,0,0.25)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }}
        allowFontScaling={false}
      >
        {number}
      </Text>
    </View>
  );
}
