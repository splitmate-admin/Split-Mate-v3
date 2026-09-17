import test from 'node:test';
import assert from 'node:assert/strict';
import { activateLanguage } from '../i18n/core.js';
import { formatDisplayDateTime, formatDateTime, parseFormattedDate } from './dateUtils.js';

test('date-only display does not move to the previous day', () => {
  activateLanguage('en');
  assert.equal(formatDisplayDateTime('2026-09-17'), '9/17/2026');
  activateLanguage('zh-CN');
  assert.equal(formatDisplayDateTime('2026-09-17'), '2026/9/17');
  activateLanguage('vi');
});
test('display localization preserves the legacy parser contract and Vietnam timezone', () => {
  activateLanguage('en');
  assert.match(formatDisplayDateTime('2026-09-16T18:30:00Z'), /09\/17\/2026.*01:30/);
  assert.equal(formatDateTime('10:43 17/09/2026'), '10:43 17/09/2026');
  assert.equal(parseFormattedDate('10:43 17/09/2026').getDate(), 17);
  activateLanguage('vi');
});
