// Safety tests — gambling-content guard + age gate.
// Run with: npm run test:safety
//
// Two modes:
//   1. STRICT (PROTOTYPE_MODE === false) — pre-App-Store-submission posture.
//      All gambling/lottery/Toto/Singapore Pools/lucky terms must be blocked.
//      The post-AI sanitiser must rewrite prediction-style phrasing.
//   2. PROTOTYPE (PROTOTYPE_MODE === true) — current dev posture per the
//      explicit override in CLAUDE.md. Most strict rules are suspended; we
//      only assert the floor: no operator impersonation, no certainty claims.
//
// The 18+ age gate rules are independent of mode and always run.
//
// Why these and only these: every other rule in the app is enforced by the
// system prompt or by code review; these are the things that, if they
// regress, take the App Store listing down. Keep this file dependency-free.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkContent, sanitiseEntertainment, PROTOTYPE_MODE } from '../filter';

// Inline copy of the production age-gate logic. Kept here (not imported from
// the screen) because the screen file pulls in React Native and won't load
// under plain Node. If the screen logic changes, update both.
function isAdult(day: number, month: number, year: number, today = new Date()): boolean {
  const dob = new Date(year, month - 1, day);
  if (isNaN(dob.getTime())) return false;
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}

// Run a test only when the strict block list is engaged. Under prototype
// mode we still emit the test name (so the runner reports it) but skip
// the body, exactly mirroring how the runtime is configured.
const strictTest = (name: string, fn: () => void) =>
  test(name, { skip: PROTOTYPE_MODE ? 'PROTOTYPE_MODE' : false }, fn);

const prototypeTest = (name: string, fn: () => void) =>
  test(name, { skip: PROTOTYPE_MODE ? false : 'STRICT_MODE' }, fn);

// ─── STRICT MODE ────────────────────────────────────────────────────

strictTest('checkContent blocks gambling operator names', () => {
  for (const phrase of [
    'Try Singapore Pools today',
    'Buy a TOTO ticket',
    'Place a 4D bet',
    'Big Sweep result',
    'SG Pools winning numbers',
  ]) {
    const r = checkContent(phrase);
    assert.equal(r.safe, false, `should block: "${phrase}"`);
    if (!r.safe) assert.equal(r.reason, 'gambling_reference');
  }
});

strictTest('checkContent blocks gambling activity verbs', () => {
  for (const phrase of [
    'Place a bet on this number',
    'I love gambling at the casino',
    'Sportsbook tips for the weekend',
    'You will hit the jackpot',
    'Wager on this lotto',
  ]) {
    const r = checkContent(phrase);
    assert.equal(r.safe, false, `should block: "${phrase}"`);
  }
});

strictTest('checkContent blocks prediction phrasing', () => {
  for (const phrase of [
    'Here are your winning numbers',
    'Sure win combination',
    'Pick numbers to win',
    'Lucky numbers for today',
    'Lucky digit of the day',
  ]) {
    const r = checkContent(phrase);
    assert.equal(r.safe, false, `should block: "${phrase}"`);
  }
});

strictTest('sanitiseEntertainment rewrites gambling-prediction phrasing', () => {
  const out = sanitiseEntertainment(
    'A guaranteed sure-win result that will predict your future.'
  );
  assert.ok(!/guaranteed/i.test(out), 'should not contain "guaranteed"');
  assert.ok(!/sure[-\s]?win/i.test(out), 'should not contain "sure win"');
  assert.ok(!/predict/i.test(out), 'should not contain "predict"');
});

strictTest('sanitiseEntertainment falls back to "blessed" if "lucky" survived', () => {
  const out = sanitiseEntertainment('A lucky reflection for you.');
  assert.ok(/blessed/i.test(out));
  assert.ok(!/lucky/i.test(out));
});

// ─── PROTOTYPE MODE ─────────────────────────────────────────────────
// Floor rules — even under the relaxed prototype block list these MUST hold.

prototypeTest('checkContent still blocks operator impersonation', () => {
  for (const phrase of [
    'Sourced from Singapore Pools',
    'Powered by SG Pools',
    'A Tote Board exclusive',
  ]) {
    const r = checkContent(phrase);
    assert.equal(r.safe, false, `should block: "${phrase}"`);
  }
});

prototypeTest('checkContent still blocks certainty claims', () => {
  for (const phrase of [
    'Guaranteed win today',
    'Sure win combination',
    'You will definitely win',
    'You will win the jackpot',
  ]) {
    const r = checkContent(phrase);
    assert.equal(r.safe, false, `should block: "${phrase}"`);
  }
});

prototypeTest('checkContent allows TOTO/4D/lucky cultural framing', () => {
  // These are the strings that were rejected in strict mode but are
  // explicitly allowed in prototype mode.
  for (const phrase of [
    'Your TOTO numbers for today',
    '4D combinations to consider',
    'Lucky number 8 brings prosperity',
  ]) {
    const r = checkContent(phrase);
    assert.equal(r.safe, true, `should allow in prototype: "${phrase}"`);
  }
});

prototypeTest('sanitiseEntertainment softens certainty even in prototype', () => {
  const out = sanitiseEntertainment('You will definitely win and a guaranteed jackpot awaits.');
  assert.ok(!/will definitely win/i.test(out), 'should soften "will definitely win"');
  assert.ok(!/guaranteed jackpot/i.test(out), 'should soften "guaranteed jackpot"');
});

// ─── ALWAYS-ON ──────────────────────────────────────────────────────

test('checkContent allows neutral cultural reflection', () => {
  for (const phrase of [
    'The number 8 carries a long tradition of prosperity in Chinese culture.',
    'Today, take a quiet moment to reflect on what 6 means for you.',
    'Blessed numbers are a personal cultural reminder, not a forecast.',
  ]) {
    const r = checkContent(phrase);
    assert.equal(r.safe, true, `should allow: "${phrase}"`);
  }
});

test('checkContent rejects empty input', () => {
  const r = checkContent('   ');
  assert.equal(r.safe, false);
  if (!r.safe) assert.equal(r.reason, 'empty');
});

test('age gate accepts an 18-year-old on their birthday', () => {
  const today = new Date(2026, 3, 27); // 2026-04-27
  assert.equal(isAdult(27, 4, 2008, today), true);
});

test('age gate rejects someone one day shy of 18', () => {
  const today = new Date(2026, 3, 27);
  assert.equal(isAdult(28, 4, 2008, today), false);
});

test('age gate rejects clearly under-age users', () => {
  const today = new Date(2026, 3, 27);
  assert.equal(isAdult(1, 1, 2015, today), false);
});

test('age gate accepts older adults (target audience)', () => {
  const today = new Date(2026, 3, 27);
  assert.equal(isAdult(15, 6, 1955, today), true);
});

test('age gate rejects malformed dates', () => {
  const today = new Date(2026, 3, 27);
  assert.equal(isAdult(NaN, NaN, NaN, today), false);
});
