import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRates } from './fx.js';
import { CURRENCIES } from '../src/utils/money.js';

const fixture = CURRENCIES.filter(code => code !== 'VND').map(quote => ({ base: 'VND', quote, rate: 0.00004, date: '2026-09-16' }));
test('reference rates are inverted to VND per source unit with attribution', () => {
  const result = normalizeRates(fixture);
  assert.equal(result.rates.VND, 1);
  assert.ok(Math.abs(result.rates.USD - 25000) < 1e-8);
  assert.equal(result.source, 'Frankfurter');
  assert.equal(result.quotedAt, '2026-09-16T00:00:00.000Z');
  assert.deepEqual(Object.keys(result.rates).sort(), [...CURRENCIES].sort());
});
test('incomplete, invalid and zero-rate payloads are never guessed', () => {
  for (const value of [null, {}, [], fixture.slice(1), fixture.map(row => ({ ...row, rate: 0 })), fixture.map(row => ({ ...row, rate: Infinity }))]) {
    assert.throws(() => normalizeRates(value));
  }
});
