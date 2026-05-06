// Lightweight wrapper around expo-av Sound. Loads the MFA slot SFX
// once and exposes named play() helpers that overlap-fail safely
// (a failed play never throws — the spin still proceeds).

import { Audio, AVPlaybackSource } from 'expo-av';

type SoundKey =
  | 'reelsSpin'
  | 'reelStop'
  | 'bonusLand'
  | 'button'
  | 'win'
  | 'wildLanding';

const SOURCES: Record<SoundKey, AVPlaybackSource> = {
  reelsSpin:   require('../assets/mfa/sounds/reels_spin.wav'),
  reelStop:    require('../assets/mfa/sounds/reel_stop.wav'),
  bonusLand:   require('../assets/mfa/sounds/bonus_land.wav'),
  button:      require('../assets/mfa/sounds/general_button.wav'),
  win:         require('../assets/mfa/sounds/bonusWin.wav'),
  wildLanding: require('../assets/mfa/sounds/wild_landing.wav'),
};

const cache: Partial<Record<SoundKey, Audio.Sound>> = {};
let configured = false;
let warnedOnce = false;

async function ensureConfigured() {
  if (configured) return;
  try {
    await Audio.setAudioModeAsync({
      // Ring/silent toggle should NOT silence slot SFX since the user
      // is intentionally engaging with the reveal animation.
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    configured = true;
  } catch (err) {
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn('[slotSounds] audio setup failed', err);
    }
  }
}

async function load(key: SoundKey): Promise<Audio.Sound | null> {
  if (cache[key]) return cache[key]!;
  try {
    await ensureConfigured();
    const { sound } = await Audio.Sound.createAsync(SOURCES[key], { volume: 0.85 });
    cache[key] = sound;
    return sound;
  } catch (err) {
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn(`[slotSounds] failed to load ${key}`, err);
    }
    return null;
  }
}

/** Preload every sound. Safe to call repeatedly. */
export async function preloadSlotSounds(): Promise<void> {
  await Promise.all((Object.keys(SOURCES) as SoundKey[]).map(load));
}

export async function playSound(key: SoundKey, opts?: { loop?: boolean }) {
  const sound = await load(key);
  if (!sound) return;
  try {
    await sound.setIsLoopingAsync(!!opts?.loop);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (err) {
    // Swallow — playback failure must not break the slot reveal.
  }
}

export async function stopSound(key: SoundKey) {
  const sound = cache[key];
  if (!sound) return;
  try {
    await sound.stopAsync();
  } catch {
    // ignore
  }
}

/** Stop all sounds and unload — call on screen unmount. */
export async function unloadSlotSounds() {
  const keys = Object.keys(cache) as SoundKey[];
  await Promise.all(keys.map(async k => {
    const sound = cache[k];
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {
      // ignore
    }
    delete cache[k];
  }));
}
