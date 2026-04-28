import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Colors, Spacing, Typography } from '../constants/theme';
import { Strings, NumberType } from '../constants/strings';
import { getReadings, deleteReading, Reading } from '../lib/storage';

export default function HistoryScreen() {
  const [readings, setReadings] = useState<Reading[]>([]);

  useFocusEffect(
    useCallback(() => {
      getReadings().then(setReadings);
    }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      Strings.history.deleteTitle,
      Strings.history.deleteMessage,
      [
        { text: Strings.history.deleteCancel, style: 'cancel' },
        {
          text: Strings.history.deleteConfirm,
          style: 'destructive',
          onPress: async () => {
            await deleteReading(id);
            setReadings((prev) => prev.filter((r) => r.id !== id));
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (readings.length === 0) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.emptyState}>
          <AppText style={styles.emptyIcon}>📖</AppText>
          <AppText variant="body" style={styles.emptyText}>
            {Strings.history.empty}
          </AppText>
        </SafeAreaView>
        <DisclaimerBanner />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={readings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card variant="warm" style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <AppText variant="bodyMedium" style={styles.numberType}>
                  {Strings.home.numberTypes[item.numberType as NumberType] ?? item.numberType}
                </AppText>
                <AppText variant="number" style={styles.numberValue}>
                  {item.numberInput}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                style={styles.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel="Remove reading"
              >
                <AppText style={styles.deleteIcon}>×</AppText>
              </TouchableOpacity>
            </View>
            <AppText variant="caption" style={styles.date}>
              {formatDate(item.createdAt)}
            </AppText>
            <View style={styles.divider} />
            <AppText variant="body" style={styles.excerpt} numberOfLines={4}>
              {item.content}
            </AppText>
          </Card>
        )}
      />
      <DisclaimerBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    lineHeight: Typography.sizeBase * 1.7,
  },
  list: {
    padding: Spacing.xl,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  card: {},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  numberType: {
    color: Colors.textSecondary,
    fontSize: Typography.sizeSM,
  },
  numberValue: {
    fontSize: Typography.sizeXL,
    letterSpacing: 3,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 26,
    color: Colors.textMuted,
    fontFamily: Typography.fontBody,
  },
  date: {
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  excerpt: {
    color: Colors.textSecondary,
    lineHeight: Typography.sizeBase * 1.65,
  },
});
