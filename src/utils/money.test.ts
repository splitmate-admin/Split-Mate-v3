import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney, parseExchangeRate, convertToVnd, convertCustomSplit } from './money.ts';

test('typed grouped rates cannot silently reduce the ledger by 1000 times', () => {
  for (const input of ['25000', '25.000', '25,000', '25 000']) {
    assert.equal(parseExchangeRate(input), 25000);
    assert.equal(convertToVnd(12.5, parseExchangeRate(input)!), 312500);
  }
  for (const input of ['25.000,50', '25,000.50', '25000.50', '25000,50']) assert.equal(parseExchangeRate(input), 25000.5);
  assert.equal(parseExchangeRate('2734.123', false), 2734.123);
  for (const input of ['-1', '0', '1e3', '1,2,3', 'Infinity']) assert.equal(parseExchangeRate(input), null);
});

test('decimal and grouped amounts retain cents', () => {
  for (const value of ['1234.56', '1234,56', '1,234.56', '1.234,56']) assert.equal(parseMoney(value, 'USD'), 1234.56);
  assert.equal(parseMoney('12,50', 'CNY'), 12.5);
  assert.equal(parseMoney('100.000', 'VND'), 100000);
  assert.equal(parseMoney('1,000', 'JPY'), 1000);
});
test('invalid money is rejected', () => {
  for (const value of ['-1', 'NaN', '1.2345', '1,2,3', '1e9', '']) assert.equal(parseMoney(value, 'USD'), null);
  assert.equal(parseMoney('1.5', 'JPY'), null);
  assert.throws(() => convertToVnd(10, 0));
  assert.throws(() => convertToVnd(Infinity, 25000));
});
test('foreign splits reconcile exactly without negative shares', () => {
  const split = convertCustomSplit(12.5, 'USD', 25432.7, ['a', 'b', 'c'], { a: 2.5 });
  assert.equal(Object.values(split.original).reduce((a,b)=>a+b,0), 12.5);
  assert.equal(Object.values(split.ledger).reduce((a,b)=>a+b,0), convertToVnd(12.5, 25432.7));
  assert.ok(Object.values(split.ledger).every(v => v >= 0));
  assert.throws(() => convertCustomSplit(10, 'USD', 25000, ['a'], {a:11}));
});
