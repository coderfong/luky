import React, { useState } from 'react';
import {
  View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { Colors, Spacing, Radius, Shadow } from '../constants/theme';
import { Strings } from '../constants/strings';
import { setPremium } from '../lib/storage';

// TODO: Replace mock purchase with RevenueCat (react-native-purchases).
// Install: npx expo install react-native-purchases
// Docs: https://www.revenuecat.com/docs/getting-started/installation/expo
// 1. Call Purchases.configure({ apiKey: 'appl_xxx' }) in _layout.tsx
// 2. Replace handlePurchase with Purchases.purchasePackage(package)
// 3. Replace handleRestore with Purchases.restorePurchases()
// 4. Read entitlements from CustomerInfo to set premium state

const S = Strings.paywall;

const FEATURES = [S.feature1, S.feature2, S.feature3];

type PlanKey = 'monthly' | 'annual';

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // TODO: Replace with RevenueCat purchasePackage
      // Simulating purchase for development — remove before App Store submission
      await new Promise(r => setTimeout(r, 800));
      await setPremium(true);
      Alert.alert('Welcome to Premium!', 'Every spin now lands on your blessed numbers · 100% lucky.', [
        { text: 'Great!', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Purchase Failed', 'Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      // TODO: Replace with RevenueCat restorePurchases
      await new Promise(r => setTimeout(r, 600));
      Alert.alert('No Purchases Found', 'No previous purchases were found for this Apple ID.');
    } catch {
      Alert.alert('Restore Failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} accessibilityRole="button">
          <AppText style={styles.closeText}>✕</AppText>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.glowCircle}>
            <AppText style={styles.glowGlyph}>福</AppText>
          </View>
          <AppText style={styles.eyebrow}>◉ PREMIUM</AppText>
          <AppText variant="heading" style={styles.title}>{S.title}</AppText>
          <AppText style={styles.subtitle}>{S.subtitle}</AppText>

          {/* Features */}
          <View style={styles.featureList}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureDot} />
                <AppText style={styles.featureText}>{f}</AppText>
              </View>
            ))}
          </View>

          {/* Plans */}
          <View style={styles.plans}>
            {(['monthly', 'annual'] as PlanKey[]).map(plan => (
              <TouchableOpacity
                key={plan}
                style={[styles.planCard, selectedPlan === plan && styles.planCardActive]}
                onPress={() => setSelectedPlan(plan)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPlan === plan }}
              >
                <View style={styles.planTop}>
                  <AppText style={[styles.planName, selectedPlan === plan && styles.planNameActive]}>
                    {S[plan]}
                  </AppText>
                  {plan === 'annual' && (
                    <View style={styles.saveBadge}>
                      <AppText style={styles.saveBadgeText}>{S.annualSave}</AppText>
                    </View>
                  )}
                </View>
                <AppText style={[styles.planPrice, selectedPlan === plan && styles.planPriceActive]}>
                  {S[`${plan}Price`]}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, loading && styles.ctaLoading]}
            onPress={handlePurchase}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <AppText style={styles.ctaLabel}>
              {loading ? 'Processing…' : selectedPlan === 'annual' ? S.ctaAnnual : S.ctaMonthly}
            </AppText>
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={loading}
            activeOpacity={0.7}
          >
            <AppText style={styles.restoreText}>{S.restore}</AppText>
          </TouchableOpacity>

          {/* Disclaimer */}
          <AppText style={styles.legalText}>{S.disclaimer}</AppText>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  closeBtn: {
    alignSelf: 'flex-end',
    marginRight: Spacing.xl,
    marginTop: Spacing.md,
    padding: 8,
  },
  closeText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 18, color: Colors.textMuted,
  },

  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },

  glowCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.primary,
    borderWidth: 3, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glowGlyph: { fontFamily: 'Lora_700Bold', fontSize: 38, color: Colors.gold },

  eyebrow: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 10, letterSpacing: 3, color: Colors.gold, marginBottom: 8,
  },
  title: {
    fontSize: 30, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 16, color: Colors.textSecondary, textAlign: 'center',
    marginBottom: Spacing.xl, lineHeight: 24,
  },

  featureList: { alignSelf: 'stretch', gap: 12, marginBottom: Spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.gold, marginTop: 7, flexShrink: 0,
  },
  featureText: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 16, color: Colors.textPrimary, flex: 1, lineHeight: 24,
  },

  plans: { flexDirection: 'row', gap: 12, alignSelf: 'stretch', marginBottom: Spacing.lg },
  planCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: 16,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  planCardActive: { borderColor: Colors.gold, backgroundColor: Colors.surfaceAlt },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  planName: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 14, color: Colors.textMuted, letterSpacing: 1,
  },
  planNameActive: { color: Colors.gold },
  saveBadge: {
    backgroundColor: Colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  saveBadgeText: {
    fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, color: Colors.textOnPrimary,
  },
  planPrice: {
    fontFamily: 'Lora_700Bold', fontSize: 18, color: Colors.textMuted,
  },
  planPriceActive: { color: Colors.textPrimary },

  cta: {
    alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.gold, borderRadius: Radius.md,
    paddingVertical: 20, marginBottom: Spacing.md,
    ...Shadow.gold,
  },
  ctaLoading: { opacity: 0.6 },
  ctaLabel: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 18, fontWeight: '900', letterSpacing: 0.5, color: Colors.background,
  },

  restoreBtn: { paddingVertical: 12, marginBottom: Spacing.md },
  restoreText: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 14, color: Colors.textMuted, textDecorationLine: 'underline',
  },

  legalText: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 11, color: Colors.textMuted, textAlign: 'center',
    lineHeight: 16, fontStyle: 'italic',
  },
});
