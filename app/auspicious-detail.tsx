import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { NumberBall } from '../components/NumberBall';
import { Colors, Spacing, Radius, Shadow } from '../constants/theme';

const ASSETS = {
  bgApp: require('../assets/ui/bg-app.png'),
  cardSurface: require('../assets/ui/card-surface.png'),
};

// Dedicated page for the AI's deep reading of a single auspicious number.
// Reached by tapping any of the 3 daily auspicious balls on the home page.
export default function AuspiciousDetailScreen() {
  const params = useLocalSearchParams<{ n: string; meaning: string; insight: string }>();
  const n = Math.max(1, Math.min(49, parseInt((params.n as string) ?? '0', 10) || 0));
  const meaning = (params.meaning as string) ?? '';
  const insight = (params.insight as string) ?? '';

  return (
    <ImageBackground source={ASSETS.bgApp} style={styles.root} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backBtn}
          >
            <AppText style={styles.backIcon}>←</AppText>
            <AppText style={styles.backLabel}>BACK</AppText>
          </TouchableOpacity>
          <AppText style={styles.topTitle}>AUSPICIOUS NUMBER</AppText>
          <View style={{ width: 64 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroBall}>
            <NumberBall number={n} size={120} variant="red" />
          </View>

          <ImageBackground
            source={ASSETS.cardSurface}
            style={styles.card}
            imageStyle={styles.cardImage}
            resizeMode="stretch"
          >
            <AppText style={styles.cardEyebrow}>★ CULTURAL MEANING</AppText>
            <AppText style={styles.cardBody}>{meaning}</AppText>
          </ImageBackground>

          <ImageBackground
            source={ASSETS.cardSurface}
            style={styles.card}
            imageStyle={styles.cardImage}
            resizeMode="stretch"
          >
            <AppText style={styles.cardEyebrow}>✦ AI READING FOR TODAY</AppText>
            {insight ? (
              <AppText style={styles.cardBody}>{insight}</AppText>
            ) : (
              <AppText style={styles.cardEmpty}>
                Today's reading is still being prepared. Pull back to home and
                wait a moment, then tap this number again.
              </AppText>
            )}
          </ImageBackground>

          <AppText style={styles.disclaimer}>
            Cultural reflection only · for entertainment, not a forecast.
          </AppText>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  backIcon: {
    fontFamily: 'Lora_700Bold', fontSize: 22, color: Colors.gold,
  },
  backLabel: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 13,
    color: Colors.gold, letterSpacing: 1.5,
  },
  topTitle: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 13,
    letterSpacing: 2, color: Colors.cream,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  heroBall: {
    alignItems: 'center', justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.elevated,
  },
  cardImage: { borderRadius: Radius.lg },
  cardEyebrow: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 12,
    letterSpacing: 2, color: Colors.gold, marginBottom: 10,
  },
  cardBody: {
    fontFamily: 'Lora_600SemiBold', fontSize: 16,
    color: Colors.cream, lineHeight: 24,
  },
  cardEmpty: {
    fontFamily: 'SourceSans3_400Regular', fontSize: 14,
    color: Colors.cream, fontStyle: 'italic', lineHeight: 20,
  },
  disclaimer: {
    fontFamily: 'SourceSans3_400Regular', fontSize: 11,
    color: Colors.cream, textAlign: 'center',
    fontStyle: 'italic', marginTop: Spacing.md,
  },
});
