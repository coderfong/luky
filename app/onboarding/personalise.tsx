import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '../../components/ui/AppText';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../constants/theme';
import { Strings } from '../../constants/strings';
import {
  updateProfile, ZODIAC_ANIMALS, ZodiacAnimal,
} from '../../lib/storage';
import { checkContent } from '../../lib/filter';
import { track } from '../../lib/analytics';

const S = Strings.onboarding.personalise;

// Numbers traditionally seen as inauspicious in parts of SE Asian culture.
// We never assert these are unlucky — we only offer them as opt-in defaults
// for users who hold pantang beliefs and prefer to step around them.
const PANTANG_DEFAULTS = [4, 14, 24, 34, 44, 13];

export default function PersonaliseScreen() {
  const [zodiac, setZodiac] = useState<ZodiacAnimal | undefined>(undefined);
  const [favourite, setFavourite] = useState('');
  const [pantangMode, setPantangMode] = useState(false);
  const [avoidNumbers, setAvoidNumbers] = useState<number[]>(PANTANG_DEFAULTS);
  const [signal, setSignal] = useState('');
  const [errors, setErrors] = useState<{ favourite?: string; signal?: string }>({});

  const toggleAvoid = (n: number) => {
    setAvoidNumbers(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  };

  const validate = (): { fav?: number; sig?: string } | null => {
    const errs: typeof errors = {};
    let fav: number | undefined;
    if (favourite.trim()) {
      const n = parseInt(favourite, 10);
      if (!Number.isInteger(n) || n < 1 || n > 49) {
        errs.favourite = S.favouriteError;
      } else {
        fav = n;
      }
    }
    let sig: string | undefined;
    if (signal.trim()) {
      const safety = checkContent(signal);
      if (!safety.safe) {
        errs.signal = S.signalError;
      } else {
        sig = signal.trim();
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return null;
    return { fav, sig };
  };

  const handleContinue = async () => {
    const v = validate();
    if (!v) return;
    await updateProfile({
      zodiac,
      favouriteNumber: v.fav,
      pantangMode,
      avoidNumbers: pantangMode ? avoidNumbers : [],
      onboardingSignal: v.sig
        ? { text: v.sig, capturedAt: new Date().toISOString() }
        : undefined,
    });
    track('onboarding_personalise_completed', {
      hasZodiac: !!zodiac,
      hasFavourite: !!v.fav,
      pantang: pantangMode,
      avoidCount: pantangMode ? avoidNumbers.length : 0,
      hasSignal: !!v.sig,
    });
    router.push('/onboarding/disclaimer');
  };

  const handleSkip = async () => {
    track('onboarding_personalise_skipped');
    router.push('/onboarding/disclaimer');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.topBand} />

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconCircle}>
              <AppText style={styles.iconGlyph}>運</AppText>
            </View>

            <AppText variant="heading" style={styles.title}>{S.title}</AppText>
            <AppText style={styles.subtitle}>{S.subtitle}</AppText>

            {/* Zodiac picker */}
            <AppText style={styles.sectionLabel}>◉ {S.zodiacLabel}</AppText>
            <AppText style={styles.sectionHint}>{S.zodiacHint}</AppText>
            <View style={styles.zodiacGrid}>
              {ZODIAC_ANIMALS.map(animal => {
                const active = zodiac === animal;
                return (
                  <TouchableOpacity
                    key={animal}
                    style={[styles.zodiacCell, active && styles.zodiacCellActive]}
                    onPress={() => setZodiac(active ? undefined : animal)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={animal}
                  >
                    <AppText style={[styles.zodiacLabel, active && styles.zodiacLabelActive]}>
                      {animal}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Favourite number */}
            <AppText style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
              ◉ {S.favouriteLabel}
            </AppText>
            <AppText style={styles.sectionHint}>{S.favouriteHint}</AppText>
            <TextInput
              style={[styles.numericInput, errors.favourite ? styles.inputError : null]}
              placeholder={S.favouritePlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={favourite}
              onChangeText={(t) => {
                const v = t.replace(/\D/g, '').slice(0, 2);
                setFavourite(v);
                setErrors(e => ({ ...e, favourite: undefined }));
              }}
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel={S.favouriteLabel}
            />
            {errors.favourite ? (
              <AppText style={styles.errorText}>{errors.favourite}</AppText>
            ) : null}

            {/* Pantang mode */}
            <View style={[styles.pantangCard, pantangMode && styles.pantangCardActive]}>
              <View style={styles.pantangHeader}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.sectionLabel}>◉ {S.pantangLabel}</AppText>
                  <AppText style={styles.pantangHint}>{S.pantangHint}</AppText>
                </View>
                <Switch
                  value={pantangMode}
                  onValueChange={setPantangMode}
                  trackColor={{ false: Colors.border, true: Colors.gold }}
                  thumbColor={pantangMode ? Colors.background : Colors.textMuted}
                  ios_backgroundColor={Colors.border}
                  accessibilityLabel={S.pantangLabel}
                />
              </View>

              {pantangMode && (
                <View style={styles.avoidWrap}>
                  <AppText style={[styles.sectionLabel, { marginTop: Spacing.sm }]}>
                    {S.avoidLabel}
                  </AppText>
                  <AppText style={styles.sectionHint}>{S.avoidHint}</AppText>
                  <View style={styles.avoidGrid}>
                    {PANTANG_DEFAULTS.map(n => {
                      const active = avoidNumbers.includes(n);
                      return (
                        <TouchableOpacity
                          key={n}
                          style={[styles.avoidChip, active && styles.avoidChipActive]}
                          onPress={() => toggleAvoid(n)}
                          activeOpacity={0.8}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: active }}
                        >
                          <AppText style={[styles.avoidChipText, active && styles.avoidChipTextActive]}>
                            {n}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Onboarding signal */}
            <AppText style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
              ◉ {S.signalLabel}
            </AppText>
            <AppText style={styles.sectionHint}>{S.signalHint}</AppText>
            <TextInput
              style={[styles.signalInput, errors.signal ? styles.inputError : null]}
              placeholder={S.signalPlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={signal}
              onChangeText={(t) => {
                setSignal(t.slice(0, 140));
                setErrors(e => ({ ...e, signal: undefined }));
              }}
              multiline
              numberOfLines={3}
              maxLength={140}
              accessibilityLabel={S.signalLabel}
            />
            {errors.signal ? (
              <AppText style={styles.errorText}>{errors.signal}</AppText>
            ) : null}

            <AppText style={styles.footnote}>{S.footnote}</AppText>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cta}
              onPress={handleContinue}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <AppText style={styles.ctaLabel}>{S.cta}</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <AppText style={styles.skipLabel}>{S.skip}</AppText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  topBand: { height: 6, backgroundColor: Colors.primary },

  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'stretch',
  },

  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    borderWidth: 2, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  iconGlyph: {
    fontFamily: 'Lora_700Bold', fontSize: 32, color: Colors.gold,
  },

  title: {
    color: Colors.textPrimary,
    textAlign: 'center',
    fontSize: Typography.sizeXL,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: Typography.sizeSM,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },

  sectionLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 2, color: Colors.gold,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 14, color: Colors.textMuted,
    marginBottom: Spacing.sm, lineHeight: 20,
  },

  zodiacGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  zodiacCell: {
    width: '23%', paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  zodiacCellActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.surfaceAlt,
  },
  zodiacLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 13, color: Colors.textSecondary,
  },
  zodiacLabelActive: { color: Colors.gold },

  numericInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 16,
    fontFamily: 'Lora_700Bold',
    fontSize: 22, color: Colors.textPrimary,
    textAlign: 'center',
    width: 120,
  },
  inputError: { borderColor: Colors.error },

  pantangCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
  },
  pantangCardActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.surfaceAlt,
    ...Shadow.card,
  },
  pantangHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  pantangHint: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, color: Colors.textMuted,
    lineHeight: 18, marginTop: 2,
  },
  avoidWrap: { marginTop: Spacing.md },
  avoidGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  avoidChip: {
    minWidth: 52, height: 44, paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avoidChipActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.primary,
  },
  avoidChipText: {
    fontFamily: 'Lora_700Bold', fontSize: 18, color: Colors.textMuted,
  },
  avoidChipTextActive: { color: Colors.gold },

  signalInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontFamily: 'SourceSans3_400Regular',
    fontSize: Typography.sizeSM, color: Colors.textPrimary,
    minHeight: 80, textAlignVertical: 'top',
  },

  errorText: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, color: Colors.error, marginTop: 6,
  },

  footnote: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 12, color: Colors.textMuted,
    textAlign: 'center', marginTop: Spacing.xl,
    lineHeight: 18, fontStyle: 'italic',
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cta: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    ...Shadow.gold,
  },
  ctaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 18, fontWeight: '900', letterSpacing: 0.5,
    color: Colors.background,
  },
  skipBtn: { paddingVertical: Spacing.md, alignItems: 'center' },
  skipLabel: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 14, color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
