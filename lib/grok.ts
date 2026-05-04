import { checkContent, sanitiseEntertainment } from './filter';
import {
  IntentionId, INTENTIONS,
  CULTURAL_NUMBER_NOTES, getNumberMeaning,
} from './numbers';

// Switched from xAI Grok → Groq Cloud. Same OpenAI-compatible chat-completions
// shape, so only the URL + model name change. Keep `grok` in this file's name
// and log prefixes for now to avoid a churn-y rename — search-and-replace can
// happen later if needed. The provider is identified at runtime by the key
// prefix only (xai-… vs gsk_…) — we don't validate it here.
const GROK_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 1;

// PROTOTYPE_MODE prompt — TOTO/4D/lucky-number framing allowed. The hard
// limits are kept on certainty ("guaranteed", "sure win") and on
// pretending to be an operator. See lib/filter.ts → PROTOTYPE_MODE.
const SYSTEM_PROMPT = `You are a warm AI guide for an entertainment app that blends Chinese, Malay, and Indian numerology with daily lucky-number suggestions for users in Singapore and SEA. You speak with warmth and respect to adults aged 55–80. The app is for adults 18+.

You may refer to TOTO, 4D, daily lucky numbers, fortune sticks (Kau Cim), zodiac compatibility, BaZi elements, I Ching hexagrams, and Tong Shu almanac advice. Use plain, kind English a 70-year-old can read at a glance.

LIMITS — keep these:
- This app has NO formal affiliation with Singapore Pools, the Tote Board, or any betting operator. Do not pretend it is endorsed by any of them.
- NEVER promise certainty: no "guaranteed win", "sure win", "you will win", "100% jackpot". Soften any such phrasing.
- Always frame numbers as "auspicious suggestions for reflection" — they are entertainment, not financial advice.
- Be specific to the person — connect their first name, birth month, and zodiac to the meaning.
- Keep tone warm, dignified, never pushy or salesy.
- Include a brief reminder near the end that this is for cultural fun and the user should play within their means if they choose to play any number game.`;

export interface ReadingRequest {
  name: string;
  birthdate: string; // YYYY-MM-DD
  intentions: IntentionId[];
  numbers: number[];
  theme?: string;
  premium?: boolean;
  dreamSign?: string; // optional: a symbol/sign/dream the user mentions
}

export type AnalysisResult =
  | { ok: true; content: string; stub?: boolean }
  | {
      ok: false;
      error:
        | 'safety_blocked'
        | 'api_error'
        | 'network_error'
        | 'timeout'
        | 'response_blocked'
        | 'missing_key';
    };

function formatBirthdate(birthdate: string): string {
  const [year, month, day] = birthdate.split('-');
  const months = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const m = parseInt(month, 10);
  return `${parseInt(day, 10)} ${months[m] ?? month} ${year}`;
}

// Strip PII before AI: send first name + birth month/year only, no surnames or full DOB.
function piiSafeProfile(name: string, birthdate: string) {
  const firstName = name.trim().split(/\s+/)[0] || 'Friend';
  const [year] = birthdate.split('-');
  const monthName = formatBirthdate(birthdate).split(' ').slice(1, 2)[0] ?? '';
  return {
    firstName: firstName.slice(0, 24),
    birthMonth: monthName,
    birthYear: year || '',
  };
}

// ─────────────────────────────────────────────────────────
// Stub fallback — used when no API key. Pulls from CULTURAL_NUMBER_NOTES
// so the app stays demo-able and still ships entertainment-safe copy.
// ─────────────────────────────────────────────────────────
function stubReading(request: ReadingRequest): string {
  const { firstName } = piiSafeProfile(request.name, request.birthdate);
  const intentionLabels = request.intentions
    .map(id => INTENTIONS.find(i => i.id === id)?.label ?? id)
    .join(', ');
  const intentTail = intentionLabels
    ? ` Drawn with intentions of ${intentionLabels.toLowerCase()}, this number is a quiet companion for ${firstName} today.`
    : ` A quiet companion for ${firstName} today.`;

  // Each block is fully standalone — no "And" connectors, no shared trailer.
  const blocks = request.numbers.map((n) => {
    const note = CULTURAL_NUMBER_NOTES[n] ?? getNumberMeaning(n);
    return `── ${n} ──\nThe number ${n} carries a long tradition of ${note.toLowerCase()}.${intentTail}`;
  });

  return blocks.join('\n\n');
}

function stubDailyInsight(numbers: number[]): string {
  return numbers
    .map(n => `${n}: ${CULTURAL_NUMBER_NOTES[n] ?? getNumberMeaning(n)}`)
    .join('\n');
}

// Apply post-AI safety pass: re-check banned terms, then rewrite gambling-prediction phrasing.
function postProcess(content: string): { ok: boolean; content: string } {
  const safety = checkContent(content);
  if (!safety.safe) {
    console.warn(`[grok] postProcess blocked: ${safety.reason}`);
    return { ok: false, content };
  }
  return { ok: true, content: sanitiseEntertainment(content) };
}

type CallResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'api_error' | 'network_error' | 'timeout' };

async function callGrokOnce(
  apiKey: string,
  userMessage: string,
  maxTokens: number,
  temperature: number
): Promise<CallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROK_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn(`[grok] API ${response.status}: ${text.slice(0, 200)}`);
      return { ok: false, reason: 'api_error' };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      console.warn('[grok] empty content in response');
      return { ok: false, reason: 'api_error' };
    }
    return { ok: true, content };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[grok] request timed out');
      return { ok: false, reason: 'timeout' };
    }
    console.warn('[grok] network error:', err);
    return { ok: false, reason: 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}

async function callGrok(
  apiKey: string,
  userMessage: string,
  maxTokens: number,
  temperature = 0.75
): Promise<CallResult> {
  let last: CallResult | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await callGrokOnce(apiKey, userMessage, maxTokens, temperature);
    if (result.ok) return result;
    last = result;
    // Only retry transient failures.
    if (result.reason === 'api_error' || result.reason === 'network_error' || result.reason === 'timeout') {
      if (attempt < MAX_RETRIES) {
        await new Promise(res => setTimeout(res, 600 * (attempt + 1)));
        continue;
      }
    }
    break;
  }
  return last ?? { ok: false, reason: 'network_error' };
}

function mapCallError(reason: 'api_error' | 'network_error' | 'timeout'): AnalysisResult {
  return { ok: false, error: reason === 'timeout' ? 'timeout' : reason };
}

export async function analyzeReading(
  request: ReadingRequest,
  apiKey: string
): Promise<AnalysisResult> {
  const inputCheck = checkContent(request.numbers.join(' '));
  if (!inputCheck.safe) return { ok: false, error: 'safety_blocked' };

  // No key → stub fallback so the app still demos cleanly.
  if (!apiKey || apiKey.length < 10) {
    console.warn('[grok] Missing EXPO_PUBLIC_GROQ_API_KEY — using stub reading');
    return { ok: true, content: stubReading(request), stub: true };
  }

  const profile = piiSafeProfile(request.name, request.birthdate);
  const intentionLabels = request.intentions
    .map((id) => INTENTIONS.find((i) => i.id === id)?.label ?? id)
    .join(', ');

  const sentencesPerNumber = request.premium ? 3 : 1;
  const wordsPerSection = request.premium ? '40–55' : '14–20';
  const themeLine = request.theme ? `\nToday's theme: ${request.theme}` : '';
  const dreamLine = request.dreamSign?.trim()
    ? `\nUser mentioned this sign or symbol: ${request.dreamSign.slice(0, 80)}`
    : '';

  const userMessage = `First name: ${profile.firstName}
Birth month: ${profile.birthMonth} ${profile.birthYear}
Intentions: ${intentionLabels}${themeLine}${dreamLine}
Today's numbers: ${request.numbers.join(', ')}

For each number, write ${sentencesPerNumber} sentence${sentencesPerNumber > 1 ? 's' : ''} explaining why it was chosen for ${profile.firstName} today — connect to their birth month, intentions${request.dreamSign ? ', and the symbol they mentioned' : ''}, and the number's cultural meaning in Southeast Asian tradition.

Format strictly — every block is standalone. Do NOT use connector words like "And", "Also", "Lastly". Do NOT include a closing line, blessing, summary, or any disclaimer text in your output.

── ${request.numbers[0]} ──
[${wordsPerSection} words, standalone, addressed to ${profile.firstName}]

── ${request.numbers[1] ?? ''} ──
[${wordsPerSection} words, standalone]

(continue for each number — exactly one block per number, nothing after the final block)`;

  const result = await callGrok(apiKey, userMessage, request.premium ? 750 : 320, 0.75);
  if (!result.ok) return mapCallError(result.reason);

  const processed = postProcess(result.content);
  if (!processed.ok) return { ok: false, error: 'response_blocked' };

  return { ok: true, content: processed.content };
}

// Stub fallback (no API key) is the intended dev/offline behaviour, so we
// only log it once per session — otherwise it spams the Metro console on
// every focus / mount.
let _stubWarned = false;

/**
 * Per-number 1-sentence cultural reason for today's featured numbers.
 * Cheap call. Cached per SGT day in storage.
 */
export async function getDailyNumbersInsight(
  numbers: number[],
  apiKey: string,
  theme?: string
): Promise<AnalysisResult> {
  if (!apiKey || apiKey.length < 10) {
    if (!_stubWarned) {
      console.info('[grok] No API key — using offline stub for daily insight (this is fine).');
      _stubWarned = true;
    }
    return { ok: true, content: stubDailyInsight(numbers), stub: true };
  }

  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const isoDate = sgt.toISOString().split('T')[0];
  const weekday = sgt.toLocaleDateString('en-SG', { weekday: 'long' });
  const monthDay = sgt.toLocaleDateString('en-SG', { day: 'numeric', month: 'long' });
  const themeLine = theme ? `\nToday's theme: "${theme}".` : '';

  const numberLines = numbers.map(n => `${n}: [one short sentence]`).join('\n');
  const userMessage = `Today is ${weekday}, ${monthDay} (Singapore Time, ${isoDate}).${themeLine}

Today's featured numbers: ${numbers.join(', ')}.

For each number, write exactly one warm short sentence (max 14 words) explaining why this number fits today — tie it to the weekday energy, today's theme, or a relevant cultural reflection (Chinese, Malay, or Indian Southeast Asian tradition).

Entertainment and cultural reflection only. No prediction. No gambling references.

Reply in exactly this format, no preamble, no closing:
${numberLines}`;

  const result = await callGrok(apiKey, userMessage, 260, 0.7);
  if (!result.ok) return mapCallError(result.reason);

  const processed = postProcess(result.content);
  if (!processed.ok) return { ok: false, error: 'response_blocked' };

  return { ok: true, content: processed.content };
}

// Legacy wrapper
export async function analyzeNumber(
  request: { numberInput: string; numberType: string },
  apiKey: string
): Promise<AnalysisResult> {
  return analyzeReading(
    {
      name: 'Friend',
      birthdate: '1960-01-01',
      intentions: ['blessing'],
      numbers: request.numberInput.split(',').map(n => parseInt(n.trim(), 10)).filter(Boolean),
    },
    apiKey
  );
}
