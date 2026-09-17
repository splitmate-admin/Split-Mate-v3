export const CURRENCIES = ['VND', 'USD', 'EUR', 'CNY', 'JPY', 'GBP', 'SGD', 'THB'] as const;
export type SupportedCurrency = typeof CURRENCIES[number];

export function currencyDecimals(currency: SupportedCurrency): number {
  return currency === 'VND' || currency === 'JPY' ? 0 : 2;
}

/** Typed rates accept conventional grouping. Provider/snapshot strings retain their exact decimals. */
export function parseExchangeRate(input: string, typed = true): number | null {
  const text = input.trim().replace(/[\s\u00a0\u202f]/g, '');
  let normalized = text;
  if (typed) {
    if (/^\d{1,3}([.,]\d{3})+$/.test(text)) normalized = text.replace(/[.,]/g, '');
    else if (text.includes('.') && text.includes(',')) {
      const decimal = text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ',';
      const group = decimal === '.' ? ',' : '.';
      const parts = text.split(decimal);
      if (parts.length !== 2 || !new RegExp(`^\\d{1,3}(\\${group}\\d{3})+$`).test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
      normalized = parts[0].split(group).join('') + '.' + parts[1];
    } else normalized = text.replace(',', '.');
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const rate = Number(normalized);
  return Number.isFinite(rate) && rate > 0 && rate <= Number.MAX_SAFE_INTEGER ? rate : null;
}

/** Accept decimal comma/dot and conventional grouping; reject ambiguous malformed input. */
export function parseMoney(input: string, currency: SupportedCurrency): number | null {
  const text = input.trim().replace(/[\s\u00a0\u202f]/g, '');
  if (!text || !/^\d+[.,\d]*$/.test(text)) return null;
  const decimals = currencyDecimals(currency);
  const dot = text.lastIndexOf('.'), comma = text.lastIndexOf(',');
  let normalized: string;
  if (dot >= 0 && comma >= 0) {
    const separator = dot > comma ? '.' : ',';
    const grouping = separator === '.' ? ',' : '.';
    const parts = text.split(separator);
    if (parts.length !== 2 || !decimals || !new RegExp(`^\\d{1,3}(\\${grouping}\\d{3})+$`).test(parts[0])) return null;
    if (!new RegExp(`^\\d{1,${decimals}}$`).test(parts[1])) return null;
    normalized = parts[0].split(grouping).join('') + '.' + parts[1];
  } else if (dot >= 0 || comma >= 0) {
    const separator = dot >= 0 ? '.' : ',';
    const parts = text.split(separator);
    if (parts.length === 2 && decimals && parts[1].length <= decimals && parts[1].length > 0) {
      normalized = parts.join('.');
    } else if (new RegExp(`^\\d{1,3}(\\${separator}\\d{3})+$`).test(text)) {
      normalized = parts.join('');
    } else return null;
  } else normalized = text;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 10 ** decimals)) ? value : null;
}

export function convertToVnd(amount: number, rateToVnd: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(rateToVnd) || rateToVnd <= 0) {
    throw new Error('INVALID_MONEY');
  }
  const converted = Math.round(amount * rateToVnd);
  if (!Number.isSafeInteger(converted) || converted <= 0) throw new Error('INVALID_MONEY');
  return converted;
}

/** Split source minor units first, then reconcile VND rounding to the exact ledger total. */
export function convertCustomSplit(
  amount: number, currency: SupportedCurrency, rate: number,
  participants: string[], specified: Record<string, number>,
): { original: Record<string, number>; ledger: Record<string, number> } {
  const scale = 10 ** currencyDecimals(currency);
  const totalUnits = Math.round(amount * scale);
  if (!participants.length || new Set(participants).size !== participants.length || !Number.isSafeInteger(totalUnits) || totalUnits <= 0) throw new Error('INVALID_SPLIT');
  const units: Record<string, number> = {};
  let allocated = 0;
  const remaining: string[] = [];
  for (const id of participants) {
    if (specified[id] === undefined) { remaining.push(id); continue; }
    const value = specified[id], minor = Math.round(value * scale);
    if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(minor) || Math.abs(value * scale - minor) > 1e-6) throw new Error('INVALID_SPLIT');
    units[id] = minor; allocated += minor;
  }
  if (allocated > totalUnits || (!remaining.length && allocated !== totalUnits)) throw new Error('INVALID_SPLIT');
  const remainder = totalUnits - allocated;
  remaining.forEach((id, index) => { units[id] = Math.floor(remainder / remaining.length) + (index < remainder % remaining.length ? 1 : 0); });
  const original: Record<string, number> = {}, ledger: Record<string, number> = {};
  let sum = 0;
  participants.forEach(id => { original[id] = units[id] / scale; ledger[id] = Math.round(original[id] * rate); sum += ledger[id]; });
  // Remove/add residual on nonzero shares without ever making a share negative.
  let residual = convertToVnd(amount, rate) - sum;
  for (const id of [...participants].reverse()) {
    if (units[id] === 0) continue;
    if (residual >= 0) { ledger[id] += residual; residual = 0; break; }
    const adjustment = Math.min(ledger[id], -residual);
    ledger[id] -= adjustment; residual += adjustment;
    if (!residual) break;
  }
  return { original, ledger };
}
