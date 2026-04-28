import { checkContent, sanitiseEntertainment } from './filter';
import {
  IntentionId, INTENTIONS,
  CULTURAL_NUMBER_NOTES, getNumberMeaning,
} from './numbers';

const GROK_BASE_URL = 'https://api.x.ai/v1/chat/completions';
const MODEL = 'grok-3-mini';
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 1;

const SYSTEM_PROMPT = `You are a warm, knowledgeable guide on numerology and cultural number traditions in Singapore and Southeast Asia, drawing from Chinese, Malay, and Indian heritage. You speak with warmth and respect to adults aged 55–80. This app is a paid entertainment and cultural-reflection app for adults 18+ only.

Frame everything as cultural reflection, not prediction.

ABSOLUTE RULES — break none of these:
- This app has NO affiliation with Singapore Pools, TOTO, 4D, Big Sweep, or any betting operator. Never imply otherwise.
- NEVER reference 4D, TOTO, lottery, lotto, jackpot, betting, gambling, casino, sweepstakes, sportsbook, or any wagering activity.
- NEVER suggest the user place a bet, buy a ticket, or take a financial action of any kind.
- NEVER use phrases like "guaranteed", "sure win", "predict", "winning numbers", "increase your odds", "beat the odds", "likely to win", "higher chance", "will bring you wealth".
- NEVER use the word "lucky" — say "blessed", "auspicious", or "meaningful" instead.
- NEVER claim a number causes specific outcomes (wealth, health, love). Talk about cultural meaning and personal reflection only.
- Use simple, clear English a 70-year-old can read at a glance.
- Be specific to the person — connect their first name and birth month to the cultural meaning.
- Keep tone warm, dignified, never salesy.`;

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
    console.warn('[grok] Missing EXPO_PUBLIC_GROK_API_KEY — using stub reading');
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
    console.warn('[grok] Missing key — using stub daily insight');
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
