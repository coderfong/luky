// Temple Dark — warm cultural-reflection palette inspired by SE Asian temple lacquer & gilt
export const Colors = {
  primary: '#E63946',
  primaryLight: '#FF4757',
  primaryDark: '#B1202E',
  gold: '#F4C430',
  goldDeep: '#D4A319',
  goldPale: 'rgba(244,196,48,0.14)',
  background: '#0D0D12',
  backgroundDeep: '#07070A',
  surface: '#17171F',
  surfaceAlt: '#1E1E28',
  border: 'rgba(244,196,48,0.18)',
  borderLight: 'rgba(244,196,48,0.09)',
  textPrimary: '#FFF8E7',
  textSecondary: '#C8C4D0',
  textMuted: '#8A8799',
  textOnPrimary: '#FFFFFF',
  textOnGold: '#0D0D12',
  error: '#FF4757',
  errorLight: '#2A1015',
  success: '#5CB85C',
  divider: 'rgba(244,196,48,0.15)',
  overlay: 'rgba(7,7,10,0.88)',
  // Embossed-text palette
  cream: '#F8E9C3',
  goldHighlight: '#FFE38A',
  deepRed: '#8B0E1B',
  maroon: '#5A0712',
  brownDeep: '#1F0A06',
  brownShadow: 'rgba(20,5,0,0.85)',
} as const;

export const Typography = {
  fontHeading: 'Lora_700Bold',
  fontHeadingMedium: 'Lora_600SemiBold',
  fontBody: 'SourceSans3_400Regular',
  fontBodyMedium: 'SourceSans3_600SemiBold',
  // Display fonts used for buttons, count chips, time-box digits and
  // CN decorative headings. Embossed look is provided by EmbossedText.
  fontDisplay: 'Cinzel_800ExtraBold',     // CTA buttons (ALL CAPS)
  fontDigit: 'Teko_700Bold',              // count buttons + time-box digits
  fontCnDisplay: 'NotoSerifSC_700Bold',   // 福 / 星 / 號 / 吉 / 祥

  // 55–80 audience: every size is bumped one step. Eyebrow/caption labels
  // never drop below 14pt; body text is 22pt baseline. iOS HIG calls 17pt
  // standard — we sit a notch above that and rely on AppText's user-scaling
  // multiplier on top.
  sizeXS: 14,
  sizeSM: 16,
  sizeBase: 22,
  sizeMD: 24,
  sizeLG: 28,
  sizeXL: 32,
  size2XL: 38,
  size3XL: 50,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 9,
  },
  gold: {
    shadowColor: '#F4C430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
