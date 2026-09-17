import { CURRENCIES, SupportedCurrency } from '../src/utils/money.js';

export interface FxQuote {
  rates: Record<SupportedCurrency, number>;
  quotedAt: string;
  source: string;
}
let cache: { value: FxQuote; expiresAt: number } | undefined;
let pending: Promise<FxQuote> | undefined;

export function normalizeRates(rows: unknown): FxQuote {
  if (!Array.isArray(rows)) throw new Error('FX_UNAVAILABLE');
  const rates = { VND: 1 } as Record<SupportedCurrency, number>;
  let date = '';
  for (const currency of CURRENCIES.filter(code => code !== 'VND')) {
    const row = rows.find(row => row.base === 'VND' && row.quote === currency);
    if (!row || !Number.isFinite(row.rate) || row.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error('FX_UNAVAILABLE');
    rates[currency] = 1 / row.rate;
    if (!Number.isFinite(rates[currency])) throw new Error('FX_UNAVAILABLE');
    if (!date || row.date < date) date = row.date;
  }
  return { rates, quotedAt: date + 'T00:00:00.000Z', source: 'Frankfurter' };
}

export async function getRates(): Promise<FxQuote> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch('https://api.frankfurter.dev/v2/rates?base=VND&quotes=USD,EUR,CNY,JPY,GBP,SGD,THB', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('FX_UNAVAILABLE');
    const value = normalizeRates(await response.json());
    cache = { value, expiresAt: Date.now() + 60 * 60 * 1000 };
    return value;
  })();
  try { return await pending; } finally { pending = undefined; }
}
