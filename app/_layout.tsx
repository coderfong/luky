import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts, Lora_700Bold, Lora_600SemiBold } from '@expo-google-fonts/lora';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
} from '@expo-google-fonts/source-sans-3';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography } from '../constants/theme';
import { Strings } from '../constants/strings';
import { TextSizeProvider } from '../contexts/TextSizeContext';
import { analytics, track } from '../lib/analytics';
import { applyDailyState, STREAK_PREVIEW_MILESTONE } from '../lib/storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_700Bold,
    Lora_600SemiBold,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Stamp app_open + retention markers exactly once per process launch.
  // Then apply daily state: bump streak, reset signal-by-date storage, unlock
  // a one-day premium preview when the user crosses the milestone.
  useEffect(() => {
    void analytics.markAppOpen().catch(err =>
      console.warn('[analytics] markAppOpen failed', err)
    );
    void applyDailyState()
      .then(({ streak, previewUnlockedNow }) => {
        if (streak.streakCount >= STREAK_PREVIEW_MILESTONE) {
          track('streak_milestone', { count: streak.streakCount });
        }
        if (previewUnlockedNow) {
          track('premium_preview_unlocked', { streak: streak.streakCount });
        }
      })
      .catch(err => console.warn('[storage] applyDailyState failed', err));
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <TextSizeProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontFamily: Typography.fontHeading,
            fontSize: 20,
            color: Colors.textPrimary,
          },
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false,
          headerBackButtonMenuEnabled: false,
        }}
      >
        <Stack.Screen name="onboarding/welcome" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/profile" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/personalise" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/disclaimer" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/first-reading" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="number-select" options={{ headerShown: false }} />
        <Stack.Screen name="draw" options={{ headerShown: false }} />
        <Stack.Screen name="analysis" options={{ headerShown: false }} />
        <Stack.Screen
          name="history"
          options={{ title: Strings.history.title }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: Strings.settings.title }}
        />
      </Stack>
    </TextSizeProvider>
  );
}
