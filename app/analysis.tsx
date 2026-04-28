import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert,
  Animated, Easing,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { NumberBall } from '../components/NumberBall';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Colors, Spacing, Radius, Shadow } from '../constants/theme';
import { Strings } from '../constants/strings';
import {
  getNumberMeaning, hashNumbers, getAffirmation,
  AUSPICIOUS_COLORS, INTENTIONS, IntentionId,
} from '../lib/numbers';
import { analyzeReading } from '../lib/grok';
import {
  saveReading, getProfile,
  getTodayAnalysisCache, saveTodayAnalysisCache,
} from '../lib/storage';

const GROK_API_KEY = process.env.EXPO_PUBLIC_GROK_API_KEY ?? '';

const DIRECTIONS = ['East · 東', 'South · 南', 'North · 北', 'West · 西', 'Southeast · 東南'];
const ELEMENTS = ['Wood · 木', 'Fire · 火', 'Earth · 土', 'Metal · 金', 'Water · 水'];
const HOURS = ['07:24', '08:08', '09:18', '11:11', '13:38', '18:28'];

type ScreenState = 'loading' | 'ready' | 'error';

export default function AnalysisScreen() {
  const { numbers: numbersParam, intentions: intentionsParam } = useLocalSearchParams<{
    numbers: string;
    intentions: string;
  }>();

  const numbers = useMemo<number[]>(
    () => (numbersParam ? JSON.parse(numbersParam) : []),
    [numbersParam]
  );
  const intentions = useMemo<IntentionId[]>(
    () => (intentionsParam ? JSON.parse(intentionsParam) : ['blessing']),
    [intentionsParam]
  );

  const serialNo = hashNumbers(numbers);
  const extrasIdx = numbers.reduce((a, n) => a + n, 0);
  const primaryIntention = intentions[0] ?? 'blessing';
  const color = AUSPICIOUS_COLORS[primaryIntention];
  const direction = DIRECTIONS[extrasIdx % DIRECTIONS.length];
  const element = ELEMENTS[extrasIdx % ELEMENTS.length];
  const hour = HOURS[extrasIdx % HOURS.length];
  const affirmation = getAffirmation(numbers);

  const intentionLabels = intentions
    .map(id => INTENTIONS.find(i => i.id === id)?.label ?? id)
    .join(' · ');

  const [state, setState] = useState<ScreenState>('loading');
  const [content, setContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saved, setSaved] = useState(false);

  // Stagger entry per row
  const rowAnims = useRef(numbers.map(() => new Animated.Value(0))).current;

  // Parse the AI response into a per-number map: { 8: 'three sentences…', 18: '…' }
  const numberSections = useMemo<Record<number, string>>(() => {
    if (!content) return {};
    const map: Record<number, string> = {};
    for (const n of numbers) {
      const pattern = new RegExp(`──\\s*${n}\\s*──\\s*([\\s\\S]*?)(?=\\s*──\\s*\\d|$)`);
      const match = content.match(pattern);
      if (match) map[n] = match[1].trim();
    }
    return map;
  }, [content, numbers]);

  useEffect(() => {
    if (!numbers.length) { router.back(); return; }
    fetchReading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stagger fade-up of each row when content arrives
  useEffect(() => {
    if (state !== 'ready') return;
    const animations = rowAnims.map((a, i) =>
      Animated.timing(a, {
        toValue: 1,
        duration: 380,
        delay: i * 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.stagger(0, animations).start();
  }, [state, rowAnims]);

  const fetchReading = async () => {
    setState('loading');
    setSaved(false);

    // Use cached analysis for today if available
    const cached = await getTodayAnalysisCache(numbers);
    if (cached) {
      setContent(cached);
      setState('ready');
      return;
    }

    const profile = await getProfile();
    const result = await analyzeReading(
      {
        name: profile?.name ?? 'Friend',
        birthdate: profile?.birthdate ?? '1960-01-01',
        intentions,
        numbers,
      },
      GROK_API_KEY
    );

    if (result.ok) {
      setContent(result.content);
      await saveTodayAnalysisCache(numbers, result.content);
      setState('ready');
    } else {
      setErrorMsg(
        result.error === 'missing_key'
          ? Strings.analysis.errorMissingKey
          : result.error === 'safety_blocked' || result.error === 'response_blocked'
          ? Strings.analysis.errorSafety
          : result.error === 'network_error'
          ? Strings.analysis.errorNetwork
          : Strings.analysis.errorGeneric
      );
      setState('error');
    }
  };

  const handleSave = async () => {
    if (saved || !content) return;
    await saveReading({
      id: Date.now().toString(),
      numberInput: numbers.join(', '),
      numberType: intentionLabels,
      content,
      createdAt: new Date().toISOString(),
      numbers,
      intentions,
    });
    setSaved(true);
    Alert.alert('', Strings.analysis.savedConfirm);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Top bar — close back to home */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={styles.closeBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppText style={styles.closeIcon}>←</AppText>
            <AppText style={styles.closeLabel}>HOME</AppText>
          </TouchableOpacity>
          <AppText style={styles.topBarTitle}>READING</AppText>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero header */}
          <View style={styles.hero}>
            <AppText style={styles.heroEyebrow}>★ YOUR PERSONAL READING ★</AppText>
            <AppText style={styles.heroTitle}>Why These Numbers</AppText>
            <AppText style={styles.heroSubtitle}>
              The cultural meaning the numbers carry for you, today
            </AppText>
            <AppText style={styles.heroGlyph}>福  星  顯  現</AppText>
          </View>

          {/* Ticket stub */}
          <View style={styles.ticket}>
            <View style={styles.perforationRow}>
              {Array.from({ length: 12 }).map((_, i) => (
                <View key={i} style={styles.perfDot} />
              ))}
            </View>

            <View style={styles.ticketHeader}>
              <View>
                <AppText style={styles.ticketBrand}>BLESSED 88 · READING SLIP</AppText>
                <AppText style={styles.ticketSerial}>#BL-{serialNo}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText style={styles.ticketDate}>
                  {new Date().toLocaleDateString('en-SG', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  }).toUpperCase()}
                </AppText>
                <AppText style={styles.ticketType}>{intentionLabels.toUpperCase()}</AppText>
              </View>
            </View>

            <AppText style={styles.ticketSectionLabel}>YOUR BLESSED NUMBERS</AppText>
            <View style={styles.ticketBalls}>
              {numbers.map((n, i) => (
                <NumberBall key={i} number={n} size={44} variant="red" />
              ))}
            </View>

            <View style={styles.ticketDivider} />

            <View style={styles.ticketFooter}>
              <AppText style={styles.ticketFooterItem}>KEY · {numbers[0]}</AppText>
              <AppText style={styles.ticketFooterItem}>
                {INTENTIONS.find(i => i.id === primaryIntention)?.glyph} {intentionLabels.split(' · ')[0]}
              </AppText>
              <AppText style={styles.ticketFooterItem}>
                {direction.split('·')[0].trim().toUpperCase()}
              </AppText>
            </View>

            <View style={styles.barcode}>
              {Array.from({ length: 48 }).map((_, i) => (
                <View key={i} style={[styles.barLine, {
                  width: (i * 17) % 3 + 1,
                  opacity: (i * 7) % 10 > 3 ? 0.9 : 0.2,
                }]} />
              ))}
            </View>

            <View style={styles.perforationRow}>
              {Array.from({ length: 12 }).map((_, i) => (
                <View key={i} style={styles.perfDot} />
              ))}
            </View>
          </View>

          {/* Number by number — AI explains each one */}
          <AppText style={styles.sectionLabel}>◉ NUMBER BY NUMBER</AppText>
          <AppText style={styles.sectionHint}>
            What each number means for you
          </AppText>

          {state === 'error' && (
            <View style={styles.errorBox}>
              <AppText style={styles.errorText}>{errorMsg}</AppText>
              <TouchableOpacity onPress={fetchReading} style={styles.retryBtn}>
                <AppText style={styles.retryLabel}>Try Again</AppText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.numberBreakdown}>
            {numbers.map((n, i) => {
              const opacity = rowAnims[i];
              const translateY = rowAnims[i].interpolate({
                inputRange: [0, 1], outputRange: [10, 0],
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.numRow,
                    i > 0 && styles.numRowBorder,
                    state === 'ready' && { opacity, transform: [{ translateY }] },
                  ]}
                >
                  <NumberBall number={n} size={48} variant="red" />
                  <View style={styles.numTextBlock}>
                    <AppText style={styles.numMeaning}>{getNumberMeaning(n)}</AppText>
                    {state === 'loading' && (
                      <View style={styles.shimmer}>
                        <View style={[styles.shimmerLine, { width: '88%' }]} />
                        <View style={[styles.shimmerLine, { width: '72%' }]} />
                        <View style={[styles.shimmerLine, { width: '40%' }]} />
                      </View>
                    )}
                    {state === 'ready' && numberSections[n] ? (
                      <AppText style={styles.numAiText}>{numberSections[n]}</AppText>
                    ) : null}
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* Affirmation */}
          <View style={styles.affirmationCard}>
            <AppText style={styles.affirmationLabel}>◉ TODAY'S REFLECTION</AppText>
            <AppText style={styles.affirmationText}>"{affirmation}"</AppText>
          </View>

          {/* Cultural extras */}
          <View style={styles.extrasGrid}>
            {[
              { label: 'AUSPICIOUS COLOR', value: color.name, swatch: color.hex },
              { label: 'FACE DIRECTION', value: direction, swatch: null },
              { label: 'BEST HOUR', value: hour, swatch: null },
              { label: 'ELEMENT', value: element, swatch: null },
            ].map((item, i) => (
              <View key={i} style={styles.extraCell}>
                <AppText style={styles.extraLabel}>{item.label}</AppText>
                <View style={styles.extraValueRow}>
                  {item.swatch && (
                    <View style={[styles.colorSwatch, { backgroundColor: item.swatch }]} />
                  )}
                  <AppText style={styles.extraValue}>{item.value}</AppText>
                </View>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {state === 'ready' && (
              <TouchableOpacity
                style={[styles.saveBtn, saved && styles.saveBtnDone]}
                onPress={handleSave}
                disabled={saved}
                activeOpacity={0.85}
              >
                <AppText style={styles.saveBtnLabel}>
                  {saved ? '✓ SAVED' : 'SAVE THIS READING'}
                </AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => router.replace('/')}
              activeOpacity={0.85}
            >
              <AppText style={styles.newBtnLabel}>BACK TO HOME</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <DisclaimerBanner />
      </SafeAreaView>
    </View>
  );
}

const TICKET_BG = '#FFF8E7';
const TICKET_INK = '#1A140F';
const TICKET_RED = '#B1202E';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: Spacing.xxl },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: Radius.sm,
    minWidth: 80,
  },
  closeIcon: {
    fontFamily: 'Lora_700Bold', fontSize: 22, color: Colors.gold,
    marginRight: 6, lineHeight: 22,
  },
  closeLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, letterSpacing: 2,
    color: Colors.gold,
  },
  topBarTitle: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, letterSpacing: 3,
    color: Colors.textMuted,
  },

  hero: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  heroEyebrow: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 12, letterSpacing: 3, color: Colors.gold, marginBottom: 8,
  },
  heroTitle: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 36, fontWeight: '900', color: Colors.textPrimary,
    letterSpacing: -1, lineHeight: 42, textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 17, color: Colors.textSecondary,
    textAlign: 'center', marginTop: 8, letterSpacing: 0.3, lineHeight: 24,
  },
  heroGlyph: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 14, letterSpacing: 6, color: Colors.gold, marginTop: 10,
  },

  ticket: {
    backgroundColor: TICKET_BG,
    borderRadius: Radius.md, marginBottom: Spacing.lg,
    overflow: 'hidden', ...Shadow.elevated,
  },
  perforationRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 4, backgroundColor: TICKET_BG,
  },
  perfDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.background,
  },
  ticketHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: TICKET_RED, borderStyle: 'dashed',
  },
  ticketBrand: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, letterSpacing: 2, color: TICKET_RED,
  },
  ticketSerial: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, fontWeight: '700',
    color: TICKET_INK, marginTop: 2,
  },
  ticketDate: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, letterSpacing: 1, color: TICKET_INK,
  },
  ticketType: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, letterSpacing: 1,
    color: TICKET_RED, fontWeight: '700', marginTop: 2,
  },
  ticketSectionLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, letterSpacing: 2,
    color: TICKET_RED, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10,
  },
  ticketBalls: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 14, gap: 4,
    flexWrap: 'wrap',
  },
  ticketDivider: {
    borderTopWidth: 1, borderTopColor: TICKET_RED, borderStyle: 'dashed',
    marginHorizontal: 18, marginBottom: 10,
  },
  ticketFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 12,
  },
  ticketFooterItem: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, letterSpacing: 1.5, color: TICKET_INK,
  },
  barcode: {
    flexDirection: 'row', height: 28, paddingHorizontal: 18, paddingBottom: 12,
    gap: 1, alignItems: 'stretch',
  },
  barLine: { backgroundColor: TICKET_INK, flex: 0 },

  sectionLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 10, letterSpacing: 2, color: Colors.gold, marginBottom: 4,
  },
  sectionHint: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 12, color: Colors.textMuted, marginBottom: 12,
  },

  errorBox: {
    backgroundColor: Colors.errorLight, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.md, alignItems: 'center',
  },
  errorText: {
    fontFamily: 'SourceSans3_400Regular',
    color: Colors.error, textAlign: 'center', marginBottom: 12, fontSize: 15,
  },
  retryBtn: {
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: Radius.sm, borderWidth: 1.5,
    borderColor: Colors.primary, alignSelf: 'center',
  },
  retryLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 14, color: Colors.primary,
  },

  numberBreakdown: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: Spacing.lg, ...Shadow.card,
  },
  numRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 14, paddingHorizontal: 14, paddingVertical: 16,
  },
  numRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  numTextBlock: { flex: 1 },
  numMeaning: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 15, letterSpacing: 0.4, color: Colors.gold, marginBottom: 8,
    textTransform: 'uppercase',
  },
  numAiText: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 18, color: Colors.textPrimary, lineHeight: 28,
  },
  shimmer: {
    gap: 6, marginTop: 4,
  },
  shimmerLine: {
    height: 12, borderRadius: 4,
    backgroundColor: Colors.surfaceAlt,
  },

  affirmationCard: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  affirmationLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, letterSpacing: 2,
    color: Colors.gold, marginBottom: 12,
  },
  affirmationText: {
    fontFamily: 'Lora_600SemiBold', fontSize: 20, fontStyle: 'italic',
    lineHeight: 30, color: Colors.textPrimary,
  },

  extrasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  extraCell: {
    width: '48%', backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  extraLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, letterSpacing: 2,
    color: Colors.gold, marginBottom: 8,
  },
  extraValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorSwatch: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  extraValue: {
    fontFamily: 'Lora_700Bold', fontSize: 18, fontWeight: '900',
    color: Colors.textPrimary, letterSpacing: -0.3, flex: 1,
  },

  actions: { gap: Spacing.md, marginBottom: Spacing.md },
  saveBtn: {
    paddingVertical: 18, borderRadius: Radius.md,
    backgroundColor: Colors.gold, alignItems: 'center', ...Shadow.gold,
  },
  saveBtnDone: { backgroundColor: Colors.surface, shadowOpacity: 0 },
  saveBtnLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 18, fontWeight: '900', letterSpacing: 0.5, color: Colors.background,
  },
  newBtn: {
    paddingVertical: 16, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  newBtnLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 17, color: Colors.textSecondary,
    letterSpacing: 1,
  },
});
