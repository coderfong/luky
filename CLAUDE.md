# Blessed Numbers — Project Guide

## What this is
iOS-only Expo (React Native + TypeScript) app targeting the App Store.
Numerology and cultural reflection for Singaporean and SEA adults aged 55–80.
AI backend: xAI Grok API (OpenAI-compatible at `https://api.x.ai/v1`).

## Hard rules (never break these)
- **Adults 18+ only.** Onboarding must enforce an age gate before any reading. See `app/onboarding/profile.tsx:isAdult`.
- **No gambling.** Never reference, link to, or simulate gambling, betting, lotteries, 4D, TOTO, Big Sweep, jackpots, sportsbooks, casinos, or any wager.
- **No Singapore Pools (or any betting operator) affiliation.** Never use their branding, logos, or imply endorsement. The disclaimer must say so explicitly.
- Never use "lucky" anywhere — always "blessed", "auspicious", or "meaningful".
- Every AI-generated response screen MUST render `<DisclaimerBanner />` (currently: `app/index.tsx`, `app/analysis.tsx`, `app/history.tsx`).
- All Grok API input/output passes through `lib/filter.ts:checkContent()` before use; output also passes through `sanitiseEntertainment()`.
- Minimum font size 18pt — users are 55–80, large text is non-negotiable.
- iOS only. No Android, no web. `platforms: ["ios"]` in app.json.

## How the app avoids gambling-prediction claims
- **System prompt** (`lib/grok.ts`) forbids prediction language ("guaranteed", "sure win", "predict", "winning numbers", etc.) and forbids mentioning any operator.
- **Pre-call filter** (`lib/filter.ts:checkContent`) rejects any user-provided string that contains gambling terms before it reaches Grok.
- **Post-call filter** re-runs `checkContent` on Grok output. If anything slips through, the response is blocked and the UI shows the safety error.
- **Soft sanitiser** (`sanitiseEntertainment`) rewrites residual prediction phrasing (e.g. "guaranteed" → "meaningful", lingering "lucky" → "blessed").
- **Disclaimer** (`Strings.disclaimer.full`) explicitly states no affiliation with Singapore Pools, TOTO, 4D, Big Sweep, or any betting operator, plus the NCPG helpline.
- **Age gate** at onboarding blocks under-18 sign-ups so we are not marketing to minors.

## Tests
```
npm run test:safety   # gambling-content guard + age-gate smoke tests
npm run ts            # full type-check
```
`test:safety` runs `lib/__tests__/safety.test.ts` via `tsx` and uses Node's built-in `node:test` runner — no extra test framework. Run it before any change to `lib/filter.ts` or the age gate.

## Stack
- Expo SDK 54, React Native 0.81, React 19
- Expo Router v4 (file-based routing in `app/`)
- TypeScript strict mode
- EAS Build for App Store distribution

## Key files
- `constants/theme.ts` — all colors, typography, spacing, shadows
- `constants/strings.ts` — all copy; edit here, never inline strings in screens
- `lib/filter.ts` — content safety guard (run before every Grok call and after)
- `lib/grok.ts` — Grok API client; safety filter is already wired in
- `lib/storage.ts` — AsyncStorage for readings, onboarding state, text size
- `contexts/TextSizeContext.tsx` — global text scale (1.0 / 1.2 / 1.4)
- `components/ui/AppText.tsx` — ALL text renders through this; respects text scale
- `components/DisclaimerBanner.tsx` — non-dismissible; must appear on analysis screen

## Environment
- `EXPO_PUBLIC_GROK_API_KEY` — in `.env` (never commit). See `.env.example`.

## Routing
```
/                       → Home (number entry)
/analysis               → AI analysis (params: numberInput, numberType)
/history                → Saved readings
/settings               → Text size, about, disclaimer
/onboarding/welcome     → First launch welcome
/onboarding/disclaimer  → Mandatory disclaimer + checkbox
```

## Build commands
```
npm run build:ios:dev      # simulator build
npm run build:ios:preview  # internal TestFlight
npm run build:ios:prod     # App Store
npm run submit:ios         # submit to App Store Connect
npm run ts                 # type-check only
npm run test:safety        # gambling-guard + age-gate tests
```

## EAS submit config
Fill in `eas.json` submit section: `appleId`, `ascAppId`, `appleTeamId`.

## App Store metadata rules
- Title: "Blessed Numbers" (never "Lucky Numbers")
- Subtitle: must not contain "lucky" — use "blessed", "numerology", "cultural wisdom"
- Category: Lifestyle or Education (NOT Games or Casino)
- Age rating: 17+ — App Store Review Guideline 1.4.5 requires adults-only rating for any app with simulated draws or numbers framed as "auspicious", even with a disclaimer. The in-app age gate enforces 18+ on top of that.
- App Store description must explicitly state: not affiliated with Singapore Pools, TOTO, 4D, or any betting operator; no real-money gambling.

## Migrations / env vars
- No database; AsyncStorage only. No new keys added with the safety pass.
- No new env vars. `EXPO_PUBLIC_GROK_API_KEY` remains the only one. See `.env.example`.
