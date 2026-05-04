import React, { useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { NumberBall } from '../components/NumberBall';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Colors, Spacing, Radius, Shadow, Typography } from '../constants/theme';
import { Strings } from '../constants/strings';
import {
  getDailyAlmanac, getKauCim, getZodiacToday, getBaZiLite,
  getIChingHexagram, getTongShu, getDailyLuckyNumbers, getLuckSummary,
} from '../lib/numbers';
import { isPremium, isPremiumPreviewUnlocked, getProfile } from '../lib/storage';
import { track } from '../lib/analytics';

const S = Strings.almanac;

function todayLabel(): string {
  return new Date().toLocaleDateString('en-SG', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function birthYearOf(birthdate?: string): number | undefined {
  if (!birthdate) return undefined;
  const y = parseInt(birthdate.split('-')[0], 10);
  return Number.isFinite(y) ? y : undefined;
}

export default function AlmanacScreen() {
  const [unlocked, setUnlocked] = React.useState(false);
  const [birthYear, setBirthYear] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    (async () => {
      const [prem, preview, profile] = await Promise.all([
        isPremium(), isPremiumPreviewUnlocked(), getProfile(),
      ]);
      setUnlocked(prem || preview);
      setBirthYear(birthYearOf(profile?.birthdate));
      track('almanac_visit', { premium: prem });
    })();
  }, []);

  const almanac = useMemo(() => getDailyAlmanac(), []);
  const kauCim = useMemo(() => getKauCim(), []);
  const zodiac = useMemo(() => getZodiacToday(birthYear), [birthYear]);
  const bazi = useMemo(() => getBaZiLite(birthYear), [birthYear]);
  const iching = useMemo(() => getIChingHexagram(), []);
  const tongShu = useMemo(() => getTongShu(), []);
  const luckyNums = useMemo(() => getDailyLuckyNumbers(), []);
  const summary = useMemo(
    () => getLuckSummary({ kauCim, zodiac, bazi, almanac }),
    [kauCim, zodiac, bazi, almanac]
  );

  const baziRelationLabel = S.bazi.relationLabels[bazi.relation];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
          >
            <AppText style={styles.backGlyph}>←  Back</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title + AI badge */}
          <AppText style={styles.eyebrow}>{S.eyebrow}</AppText>
          <AppText style={styles.dateLine}>{todayLabel()}</AppText>
          <View style={styles.aiBadge}>
            <AppText style={styles.aiBadgeText}>✦ {S.aiBadge}</AppText>
          </View>

          {/* HERO — combined luck score (paywalled) */}
          <View style={styles.heroCard}>
            <View style={styles.heroAura} />
            <AppText style={styles.heroLabel}>{S.score.label}</AppText>

            {unlocked ? (
              <>
                <View style={styles.heroScoreRow}>
                  <AppText style={styles.heroScore}>{summary.score.toFixed(1)}</AppText>
                  <AppText style={styles.heroOutOf}>{S.score.outOf}</AppText>
                </View>
                <AppText style={styles.heroSummary}>{summary.oneLine}</AppText>
              </>
            ) : (
              <>
                <View style={styles.heroScoreRow}>
                  <AppText style={styles.heroScoreLocked}>?</AppText>
                  <AppText style={styles.heroOutOf}>{S.score.outOf}</AppText>
                </View>
                <TouchableOpacity
                  style={styles.heroLockBtn}
                  onPress={() => {
                    track('paywall_reached', { source: 'luck_score_lock' });
                    router.push('/paywall');
                  }}
                  accessibilityRole="button"
                >
                  <AppText style={styles.heroLockHint}>{S.score.lockedHint}</AppText>
                  <AppText style={styles.heroLockCta}>{S.score.lockedCta}</AppText>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* 1. KAU CIM — Daily Fortune Stick */}
          <SectionCard
            title={S.kauCim.title}
            subtitle={S.kauCim.subtitle}
          >
            <View style={styles.stickRow}>
              <View style={styles.stickPill}>
                <AppText style={styles.stickLabel}>{S.kauCim.stickLabel}</AppText>
                <AppText style={styles.stickNumber}>#{kauCim.stickNumber}</AppText>
              </View>
              <View style={styles.stickPillAlt}>
                <AppText style={styles.stickLabel}>{S.kauCim.ratingLabel}</AppText>
                <AppText style={styles.stickNumber}>{kauCim.rating.toFixed(1)}</AppText>
              </View>
            </View>
            <AppText style={styles.fortuneCn}>{kauCim.fortuneCn}</AppText>
            <AppText style={styles.fortuneEn}>{kauCim.fortuneEn}</AppText>
          </SectionCard>

          {/* 2. ZODIAC — Daily Animal Luck */}
          <SectionCard
            title={S.zodiac.title}
            subtitle={S.zodiac.subtitle}
          >
            <View style={styles.zodiacRow}>
              <View style={styles.zodiacBlock}>
                <AppText style={styles.zodiacBlockLabel}>YOU</AppText>
                <AppText style={styles.zodiacAnimal}>{zodiac.userAnimal}</AppText>
              </View>
              <AppText style={styles.zodiacArrow}>⇆</AppText>
              <View style={styles.zodiacBlock}>
                <AppText style={styles.zodiacBlockLabel}>TODAY</AppText>
                <AppText style={styles.zodiacAnimal}>{zodiac.dayAnimal}</AppText>
              </View>
            </View>
            <View style={styles.zodiacScoreRow}>
              <AppText style={styles.cardLabel}>{S.zodiac.compatLabel}</AppText>
              <View style={styles.zodiacScoreChip}>
                <AppText style={styles.zodiacScoreText}>
                  {zodiac.score.toFixed(1)} · {S.zodiac.rapport[zodiac.rapport]}
                </AppText>
              </View>
            </View>

            <View style={styles.zodiacListRow}>
              <AppText style={styles.cardSubLabel}>{S.zodiac.coloursLabel}</AppText>
              <View style={styles.chipRow}>
                {zodiac.colours.map((c, i) => (
                  <View key={i} style={styles.coloursChip}>
                    <AppText style={styles.coloursChipText}>{c}</AppText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.zodiacListRow}>
              <AppText style={styles.cardSubLabel}>{S.zodiac.numbersLabel}</AppText>
              <View style={styles.chipRow}>
                {zodiac.numbers.map((n, i) => (
                  <NumberBall key={i} number={n} size={36} variant="red" />
                ))}
              </View>
            </View>
          </SectionCard>

          {/* 3. BaZi — Element Balance */}
          <SectionCard
            title={S.bazi.title}
            subtitle={S.bazi.subtitle}
          >
            <View style={styles.baziRow}>
              <View style={styles.baziBlock}>
                <AppText style={styles.zodiacBlockLabel}>{S.bazi.youLabel}</AppText>
                <AppText style={styles.baziCn}>{bazi.userElementCn}</AppText>
                <AppText style={styles.baziEn}>{bazi.userElement.toUpperCase()}</AppText>
              </View>
              <AppText style={styles.zodiacArrow}>·</AppText>
              <View style={styles.baziBlock}>
                <AppText style={styles.zodiacBlockLabel}>{S.bazi.dayLabel}</AppText>
                <AppText style={styles.baziCn}>{bazi.dayElementCn}</AppText>
                <AppText style={styles.baziEn}>{bazi.dayElement.toUpperCase()}</AppText>
              </View>
            </View>
            <AppText style={styles.baziRelation}>{baziRelationLabel}</AppText>
            <AppText style={styles.baziMessage}>{bazi.message}</AppText>
          </SectionCard>

          {/* 4. I Ching — Hexagram */}
          <SectionCard
            title={S.iching.title}
            subtitle={S.iching.subtitle}
          >
            <View style={styles.hexHeader}>
              <AppText style={styles.hexCn}>{iching.cn}</AppText>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <AppText style={styles.hexNum}>#{iching.num}</AppText>
                <AppText style={styles.hexName}>{iching.name}</AppText>
              </View>
            </View>
            <View style={styles.hexBody}>
              <AppText style={styles.cardSubLabel}>{S.iching.meaningLabel}</AppText>
              <AppText style={styles.hexText}>{iching.meaning}</AppText>
              <AppText style={[styles.cardSubLabel, { marginTop: Spacing.sm }]}>
                {S.iching.adviceLabel}
              </AppText>
              <AppText style={styles.hexText}>{iching.advice}</AppText>
            </View>
          </SectionCard>

          {/* 5. Tong Shu — Do & Don't */}
          <SectionCard
            title={S.tongShu.title}
            subtitle={S.tongShu.subtitle}
          >
            <View style={styles.tongShuSplit}>
              <View style={[styles.tongShuColumn, styles.tongShuGood]}>
                <AppText style={styles.tongShuLabel}>{S.tongShu.goodFor}</AppText>
                {tongShu.goodFor.map((t, i) => (
                  <View key={i} style={styles.tongShuItem}>
                    <AppText style={styles.tongShuTick}>✓</AppText>
                    <AppText style={styles.tongShuText}>{t}</AppText>
                  </View>
                ))}
              </View>
              <View style={[styles.tongShuColumn, styles.tongShuAvoid]}>
                <AppText style={styles.tongShuLabelWarn}>{S.tongShu.avoid}</AppText>
                {tongShu.avoid.map((t, i) => (
                  <View key={i} style={styles.tongShuItem}>
                    <AppText style={styles.tongShuCross}>×</AppText>
                    <AppText style={styles.tongShuText}>{t}</AppText>
                  </View>
                ))}
              </View>
            </View>
          </SectionCard>

          {/* Lucky Numbers — 4D + TOTO format. Entertainment only. */}
          <View style={[styles.card, styles.luckyCard]}>
            <View style={styles.luckyHeader}>
              <AppText style={styles.cardTitle}>{S.luckyNumbers.title}</AppText>
              <AppText style={styles.cardLabelGold}>✦ AI</AppText>
            </View>
            <AppText style={styles.luckySub}>{S.luckyNumbers.subtitle}</AppText>

            <View style={styles.luckyBlock}>
              <AppText style={styles.luckyKind}>{S.luckyNumbers.fourD}</AppText>
              <View style={styles.fourDRow}>
                {luckyNums.fourD.map((n, i) => (
                  <View key={i} style={styles.fourDChip}>
                    <AppText style={styles.fourDText}>{n}</AppText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.luckyBlock}>
              <AppText style={styles.luckyKind}>{S.luckyNumbers.toto}</AppText>
              <View style={styles.totoRow}>
                {luckyNums.toto.map((n, i) => (
                  <NumberBall key={i} number={n} size={42} variant="red" />
                ))}
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <AppText style={styles.ctaLabel}>{S.cta}</AppText>
          </TouchableOpacity>

          <AppText style={styles.entertainmentNote}>{S.entertainmentNote}</AppText>
          <AppText style={styles.refreshNote}>{S.refresh}</AppText>
        </ScrollView>

        <DisclaimerBanner />
      </SafeAreaView>
    </View>
  );
}

// Local section card — clear, separated header for each of the 5 systems.
const SectionCard = ({
  title, subtitle, children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <View style={styles.card}>
    <AppText style={styles.cardTitle}>{title}</AppText>
    <AppText style={styles.cardSubtitle}>{subtitle}</AppText>
    <View style={styles.cardDivider} />
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    paddingVertical: 8, paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
  backGlyph: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 18, color: Colors.gold,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },

  eyebrow: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 13, letterSpacing: 2, color: Colors.gold,
    marginTop: Spacing.sm,
  },
  dateLine: {
    fontFamily: Typography.fontHeadingMedium,
    fontSize: 24, color: Colors.textPrimary,
    marginTop: 4,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    marginTop: 6, marginBottom: Spacing.lg,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(244,196,48,0.14)',
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(244,196,48,0.45)',
  },
  aiBadgeText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11, letterSpacing: 1.5, color: Colors.gold,
  },

  // Hero — luck score
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.gold,
    ...Shadow.elevated,
  },
  heroAura: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(244,196,48,0.18)',
  },
  heroLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12, letterSpacing: 2, color: Colors.gold,
    marginBottom: 6,
  },
  heroScoreRow: {
    flexDirection: 'row', alignItems: 'baseline',
    gap: 8, marginBottom: 8,
  },
  heroScore: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 64, fontWeight: '900', color: Colors.gold,
    letterSpacing: -2,
  },
  heroScoreLocked: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 64, fontWeight: '900', color: 'rgba(255,248,231,0.45)',
  },
  heroOutOf: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 14, letterSpacing: 1.5, color: 'rgba(255,248,231,0.75)',
  },
  heroSummary: {
    fontFamily: Typography.fontHeadingMedium,
    fontSize: 18, color: Colors.textPrimary, lineHeight: 24,
  },
  heroLockBtn: {
    marginTop: 4,
    padding: 12, borderRadius: Radius.sm,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderWidth: 1, borderColor: 'rgba(244,196,48,0.45)',
    borderStyle: 'dashed',
    alignItems: 'flex-start',
  },
  heroLockHint: {
    fontFamily: Typography.fontBody,
    fontSize: 14, color: 'rgba(255,248,231,0.85)', marginBottom: 4,
  },
  heroLockCta: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 16, fontWeight: '900', letterSpacing: 0.5, color: Colors.gold,
  },

  // Generic card (used by SectionCard + lucky numbers)
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 22, color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 13, letterSpacing: 1.5, color: Colors.gold,
    marginTop: 4, textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1, backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  cardLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12, letterSpacing: 1.5, color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  cardLabelGold: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11, letterSpacing: 1.5, color: Colors.gold,
  },
  cardSubLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12, letterSpacing: 1, color: Colors.textMuted,
    marginBottom: 6,
  },

  // Kau Cim
  stickRow: {
    flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md,
  },
  stickPill: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: 'rgba(244,196,48,0.35)',
  },
  stickPillAlt: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: Colors.gold, borderRadius: Radius.sm,
  },
  stickLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 10, letterSpacing: 1.5, color: Colors.textMuted,
  },
  stickNumber: {
    fontFamily: Typography.fontHeading,
    fontSize: 26, color: Colors.gold,
    letterSpacing: -0.3, marginTop: 2,
  },
  fortuneCn: {
    fontFamily: Typography.fontHeading,
    fontSize: 28, color: Colors.gold,
    letterSpacing: 4, textAlign: 'center', marginTop: 4,
  },
  fortuneEn: {
    fontFamily: Typography.fontHeadingMedium,
    fontSize: 18, color: Colors.textPrimary, fontStyle: 'italic',
    textAlign: 'center', marginTop: 6, lineHeight: 26,
  },

  // Zodiac
  zodiacRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, marginBottom: Spacing.md,
  },
  zodiacBlock: {
    flex: 1, alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
  },
  zodiacBlockLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11, letterSpacing: 1.5, color: Colors.gold,
  },
  zodiacAnimal: {
    fontFamily: Typography.fontHeading,
    fontSize: 22, color: Colors.textPrimary,
    marginTop: 2,
  },
  zodiacArrow: {
    fontFamily: Typography.fontHeading,
    fontSize: 22, color: Colors.textMuted,
  },
  zodiacScoreRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
    marginBottom: Spacing.md,
  },
  zodiacScoreChip: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: 'rgba(244,196,48,0.15)',
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(244,196,48,0.45)',
  },
  zodiacScoreText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 14, fontWeight: '700', color: Colors.gold,
  },
  zodiacListRow: { marginTop: Spacing.sm },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 6, marginTop: 4,
  },
  coloursChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  coloursChipText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 13, color: Colors.textPrimary,
  },

  // BaZi
  baziRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.lg, marginBottom: Spacing.md,
  },
  baziBlock: {
    flex: 1, alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
  },
  baziCn: {
    fontFamily: Typography.fontHeading,
    fontSize: 38, color: Colors.gold, marginTop: 2,
  },
  baziEn: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11, letterSpacing: 1.5, color: Colors.textMuted, marginTop: 2,
  },
  baziRelation: {
    fontFamily: Typography.fontHeadingMedium,
    fontSize: 18, color: Colors.gold,
    textAlign: 'center', marginBottom: 4,
  },
  baziMessage: {
    fontFamily: Typography.fontBody,
    fontSize: 16, color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 24,
  },

  // I Ching
  hexHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  hexCn: {
    fontFamily: Typography.fontHeading,
    fontSize: 56, color: Colors.gold,
    minWidth: 64, textAlign: 'center',
  },
  hexNum: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11, letterSpacing: 1.5, color: Colors.gold,
  },
  hexName: {
    fontFamily: Typography.fontHeading,
    fontSize: 22, color: Colors.textPrimary,
    marginTop: 2,
  },
  hexBody: {
    marginTop: Spacing.sm,
  },
  hexText: {
    fontFamily: Typography.fontBody,
    fontSize: 16, color: Colors.textPrimary, lineHeight: 22,
  },

  // Tong Shu — split good/avoid
  tongShuSplit: {
    flexDirection: 'row', gap: Spacing.sm,
  },
  tongShuColumn: {
    flex: 1, padding: Spacing.md,
    borderRadius: Radius.sm, borderWidth: 1,
  },
  tongShuGood: {
    backgroundColor: 'rgba(111,207,135,0.10)',
    borderColor: 'rgba(111,207,135,0.40)',
  },
  tongShuAvoid: {
    backgroundColor: 'rgba(230,57,70,0.10)',
    borderColor: 'rgba(230,57,70,0.40)',
  },
  tongShuLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12, letterSpacing: 1.5, color: '#6FCF87',
    marginBottom: 8,
  },
  tongShuLabelWarn: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12, letterSpacing: 1.5, color: Colors.primaryLight,
    marginBottom: 8,
  },
  tongShuItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 6, marginBottom: 4,
  },
  tongShuTick: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 14, color: '#6FCF87', fontWeight: '700',
    width: 16, textAlign: 'center',
  },
  tongShuCross: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 14, color: Colors.primaryLight, fontWeight: '700',
    width: 16, textAlign: 'center',
  },
  tongShuText: {
    flex: 1,
    fontFamily: Typography.fontBody,
    fontSize: 15, color: Colors.textPrimary, lineHeight: 22,
  },

  // Lucky numbers — 4D + TOTO panels
  luckyCard: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: 'rgba(244,196,48,0.50)',
    borderWidth: 1.5,
  },
  luckyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4,
  },
  luckySub: {
    fontFamily: Typography.fontBody,
    fontSize: 13, color: Colors.textMuted, fontStyle: 'italic',
    marginTop: 2, marginBottom: Spacing.md,
  },
  luckyBlock: { marginBottom: Spacing.md },
  luckyKind: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 14, letterSpacing: 1.5, color: Colors.gold,
    marginBottom: 8,
  },
  fourDRow: {
    flexDirection: 'row', gap: Spacing.sm,
  },
  fourDChip: {
    flex: 1, paddingVertical: 14,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.gold,
    alignItems: 'center',
  },
  fourDText: {
    fontFamily: Typography.fontHeading,
    fontSize: 28, color: Colors.gold, letterSpacing: 4,
  },
  totoRow: {
    flexDirection: 'row', gap: 6, justifyContent: 'space-between',
    flexWrap: 'wrap', rowGap: 8,
  },

  // CTA + footers
  cta: {
    paddingVertical: 22, borderRadius: Radius.lg,
    backgroundColor: Colors.gold, alignItems: 'center',
    marginTop: Spacing.md, ...Shadow.gold,
  },
  ctaLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 18, fontWeight: '900', color: Colors.background,
  },
  entertainmentNote: {
    fontFamily: Typography.fontBody,
    fontSize: 13, color: Colors.textMuted,
    fontStyle: 'italic', textAlign: 'center',
    marginTop: Spacing.md, marginHorizontal: Spacing.lg,
    lineHeight: 18,
  },
  refreshNote: {
    textAlign: 'center', marginTop: Spacing.sm,
    fontFamily: Typography.fontBody,
    fontSize: 12, color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
