import test from 'node:test';
import assert from 'node:assert/strict';
import { activateLanguage, t, ui, getLocale, errorMessage, messages } from './core.js';
import { uiMessages } from './uiMessages.js';

test('all translations retain interpolation placeholders and have three nonempty versions', () => {
  for (const [key, versions] of Object.entries({ ...messages, ...uiMessages })) {
    const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.equal(versions.length, 3, key);
    for (const value of versions) {
      assert.ok(value.trim(), key);
      assert.deepEqual(placeholders(value), placeholders(versions[0]), key);
    }
  }
});
test('switching language updates UI text, locale and error fallbacks', () => {
  activateLanguage('en');
  assert.equal(t('amount'), 'Amount');
  assert.equal(t('rateToVnd', { currency: 'USD' }), 'VND per 1 USD');
  assert.equal(getLocale(), 'en-US');
  assert.equal(ui('m1d5caf099f'), 'Sign in');
  assert.equal(errorMessage('Không có thông báo máy chủ được dịch', 'Retry'), 'Retry');
  activateLanguage('zh-CN');
  assert.equal(t('currency'), '币种');
  activateLanguage('vi');
  assert.equal(t('amount'), 'Số tiền');
});
