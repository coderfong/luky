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
} as const;

export const Typography = {
  fontHeading: 'Lora_700Bold',
  fontHeadingMedium: 'Lora_600SemiBold',
  fontBody: 'SourceSans3_400Regular',
  fontBodyMedium: 'SourceSans3_600SemiBold',

  // Bumped for 55–80 audience: body text is now 20pt baseline. Eyebrow/section
  // labels stay smaller for visual hierarchy but no longer dip below 12pt.
  sizeXS: 12,
  sizeSM: 14,
  sizeBase: 20,
  sizeMD: 22,
  sizeLG: 26,
  sizeXL: 30,
  size2XL: 36,
  size3XL: 48,
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
