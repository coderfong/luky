import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Vibration, Text,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { NumberBall } from '../components/NumberBall';
import { Colors, Spacing, Radius } from '../constants/theme';
import { NumberType } from '../constants/strings';
import { deriveNumbers } from '../lib/numbers';

const MAX_SELECT = 6;

export default function NumberSelectScreen() {
  const { numberInput, numberType } = useLocalSearchParams<{
    numberInput: string;
    numberType: NumberType;
  }>();

  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (numberInput && numberType) {
      const derived = deriveNumbers(numberInput, numberType);
      setSelected(derived.slice(0, MAX_SELECT));
    }
  }, [numberInput, numberType]);

  const toggleNumber = (n: number) => {
    Vibration.vibrate(6);
    setSelected(prev => {
      if (prev.includes(n)) return prev.filter(x => x !== n);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, n];
    });
  };

  const handleReveal = () => {
    if (selected.length === 0) return;
    router.push({
      pathname: '/draw',
      params: {
        numbers: JSON.stringify(selected.sort((a, b) => a - b)),
        numberInput,
        numberType,
      },
    });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <AppText style={styles.eyebrow}>◉ SELECT YOUR NUMBERS</AppText>
          <AppText variant="heading" style={styles.title}>
            Choose Your{'\n'}Blessed Numbers
          </AppText>
          <AppText style={styles.subtitle}>
            选 择 号 码 · Tap up to {MAX_SELECT} numbers for your reading
          </AppText>
        </View>

        {/* Selected row */}
        <View style={styles.selectedRow}>
          {Array.from({ length: MAX_SELECT }).map((_, i) => (
            <View key={i} style={styles.ballSlot}>
              {selected[i] != null ? (
                <TouchableOpacity onPress={() => toggleNumber(selected[i])} activeOpacity={0.7}>
                  <NumberBall number={selected[i]} size={44} variant="red" />
                </TouchableOpacity>
              ) : (
                <View style={styles.emptySlot}>
                  <AppText style={styles.emptySlotText}>{i + 1}</AppText>
                </View>
              )}
            </View>
          ))}
        </View>

        <AppText style={styles.slotHint}>
          {selected.length} / {MAX_SELECT} selected · tap a number below to add it
        </AppText>

        {/* Number grid 1–49 */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {Array.from({ length: 49 }, (_, i) => i + 1).map(n => {
            const isSelected = selected.includes(n);
            const isDisabled = !isSelected && selected.length >= MAX_SELECT;
            return (
              <TouchableOpacity
                key={n}
                onPress={() => toggleNumber(n)}
                disabled={isDisabled}
                activeOpacity={0.7}
                style={styles.gridCell}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected, disabled: isDisabled }}
              >
                <NumberBall
                  number={n}
                  size={42}
                  variant={isSelected ? 'red' : 'ghost'}
                  dimmed={isDisabled}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, selected.length === 0 && styles.ctaDisabled]}
            onPress={handleReveal}
            disabled={selected.length === 0}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <AppText style={styles.ctaLabel}>BEGIN BLESSED REVEAL</AppText>
            <AppText style={styles.ctaGlyph}>→</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  eyebrow: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.gold,
    marginBottom: 6,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ballSlot: {
    alignItems: 'center',
  },
  emptySlot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
  },
  slotHint: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 8,
    justifyContent: 'center',
  },
  gridCell: {
    padding: 3,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 18,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaDisabled: {
    backgroundColor: Colors.surface,
    shadowOpacity: 0,
  },
  ctaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: Colors.background,
  },
  ctaGlyph: {
    fontFamily: 'Lora_700Bold',
    fontSize: 20,
    color: Colors.background,
  },
});
