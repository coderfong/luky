import React, { useRef, useState } from 'react';
import {
  View, StyleSheet, SafeAreaView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '../../components/ui/AppText';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';
import { saveProfile } from '../../lib/storage';

const S = Strings.onboarding.profile;

// 18+ age gate. Compares today's date to the supplied DOB and returns false
// for users under 18. We do not store or transmit the raw birthdate to the AI;
// see piiSafeProfile in lib/grok.ts.
function isAdult(day: number, month: number, year: number): boolean {
  const dob = new Date(year, month - 1, day);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [errors, setErrors] = useState<{ name?: string; date?: string }>({});

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const validate = (): boolean => {
    const errs: { name?: string; date?: string } = {};
    if (!name.trim()) errs.name = S.errorName;

    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const validDate =
      !isNaN(d) && !isNaN(m) && !isNaN(y) &&
      d >= 1 && d <= 31 &&
      m >= 1 && m <= 12 &&
      y >= 1920 && y <= 2010;

    if (!validDate) {
      errs.date = S.errorDate;
    } else if (!isAdult(d, m, y)) {
      errs.date = Strings.disclaimer.ageGateError;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;

    const pad = (n: string) => n.padStart(2, '0');
    const birthdate = `${year}-${pad(month)}-${pad(day)}`;

    await saveProfile({ name: name.trim(), birthdate });
    router.push('/onboarding/personalise');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          {/* Top accent */}
          <View style={styles.topBand} />

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            <View style={styles.iconCircle}>
              <AppText style={styles.iconGlyph}>福</AppText>
            </View>

            <AppText variant="heading" style={styles.title}>{S.title}</AppText>
            <AppText style={styles.subtitle}>{S.subtitle}</AppText>

            {/* Name */}
            <AppText style={styles.fieldLabel}>{S.nameLabel}</AppText>
            <TextInput
              style={[styles.textInput, errors.name ? styles.inputError : null]}
              placeholder={S.namePlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={(t) => { setName(t); setErrors(e => ({ ...e, name: undefined })); }}
              autoCapitalize="words"
              returnKeyType="next"
              accessibilityLabel={S.nameLabel}
            />
            {errors.name ? <AppText style={styles.errorText}>{errors.name}</AppText> : null}

            {/* Birthdate */}
            <AppText style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>
              {S.birthdateLabel}
            </AppText>
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.dateInput, styles.dateInputDay, errors.date ? styles.inputError : null]}
                placeholder={S.dayPlaceholder}
                placeholderTextColor={Colors.textMuted}
                value={day}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 2);
                  setDay(v);
                  setErrors(e => ({ ...e, date: undefined }));
                  if (v.length === 2) monthRef.current?.focus();
                }}
                keyboardType="number-pad"
                maxLength={2}
                accessibilityLabel="Day"
              />
              <AppText style={styles.dateSep}>/</AppText>
              <TextInput
                ref={monthRef}
                style={[styles.dateInput, styles.dateInputMonth, errors.date ? styles.inputError : null]}
                placeholder={S.monthPlaceholder}
                placeholderTextColor={Colors.textMuted}
                value={month}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 2);
                  setMonth(v);
                  setErrors(e => ({ ...e, date: undefined }));
                  if (v.length === 2) yearRef.current?.focus();
                }}
                keyboardType="number-pad"
                maxLength={2}
                accessibilityLabel="Month"
              />
              <AppText style={styles.dateSep}>/</AppText>
              <TextInput
                ref={yearRef}
                style={[styles.dateInput, styles.dateInputYear, errors.date ? styles.inputError : null]}
                placeholder={S.yearPlaceholder}
                placeholderTextColor={Colors.textMuted}
                value={year}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 4);
                  setYear(v);
                  setErrors(e => ({ ...e, date: undefined }));
                }}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                accessibilityLabel="Year"
              />
            </View>
            {errors.date ? <AppText style={styles.errorText}>{errors.date}</AppText> : null}

            <AppText style={styles.hint}>
              Your details are stored only on this device and never shared. You must be 18 or older to use this app.
            </AppText>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },

  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    borderWidth: 2.5, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconGlyph: {
    fontFamily: 'Lora_700Bold', fontSize: 36, color: Colors.gold,
  },

  title: {
    color: Colors.textPrimary, textAlign: 'center',
    fontSize: Typography.size2XL, marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: Typography.sizeSM, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl,
  },

  fieldLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 11, letterSpacing: 2, color: Colors.gold,
    alignSelf: 'flex-start', marginBottom: 8,
  },

  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 16,
    fontFamily: 'SourceSans3_400Regular',
    fontSize: Typography.sizeBase, color: Colors.textPrimary,
    alignSelf: 'stretch',
  },
  inputError: { borderColor: Colors.error },

  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'stretch', gap: 4,
  },
  dateInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 16,
    fontFamily: 'SourceSans3_400Regular',
    fontSize: Typography.sizeBase, color: Colors.textPrimary,
    textAlign: 'center',
  },
  dateInputDay: { width: 64 },
  dateInputMonth: { width: 64 },
  dateInputYear: { flex: 1 },
  dateSep: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 20, color: Colors.textMuted, paddingHorizontal: 2,
  },

  errorText: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13, color: Colors.error,
    alignSelf: 'flex-start', marginTop: 6,
  },

  hint: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 12, color: Colors.textMuted,
    textAlign: 'center', marginTop: Spacing.xl,
    lineHeight: 18, fontStyle: 'italic',
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  cta: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 18, fontWeight: '900', letterSpacing: 0.5,
    color: Colors.background,
  },
});
