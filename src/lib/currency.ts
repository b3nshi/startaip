export const CURRENCIES = ["USD", "EUR", "ARS"] as const;
export type Currency = (typeof CURRENCIES)[number];
/** Units of each currency per 1 USD. */
export type Rates = Record<Currency, number>;

export type RateMode = "fixed" | "by_date";

export const DEFAULT_RATES: Rates = { USD: 1, EUR: 0.92, ARS: 1000 };

export const isCurrency = (v: unknown): v is Currency => CURRENCIES.includes(v as Currency);

export function convert(amount: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return amount;
  return (amount / rates[from]) * rates[to];
}

/** The rates in force on a given day. Every money record points at one so its conversion is explainable and editable. */
export type RateSet = { id: string; effective_date: string; rates: Rates; note: string | null; created_at: string };

export function ratesFromJson(json: unknown): Rates {
  const out = { ...DEFAULT_RATES };
  for (const c of CURRENCIES) {
    const n = Number((json as Record<string, unknown> | null)?.[c]);
    if (c !== "USD" && n > 0) out[c] = n;
  }
  return out;
}

const rateNum = (n: number) => new Intl.NumberFormat("en-US", { maximumSignificantDigits: 6 }).format(n);

/** "1 USD = 1,200 ARS" for any pair, derived from one set of rates. */
export const rateLabel = (from: Currency, to: Currency, rates: Rates) => `1 ${from} = ${rateNum(convert(1, from, to, rates))} ${to}`;

/** "1 USD = 1,200 ARS · 0.92 EUR" */
export const ratesSummary = (rates: Rates) => `1 USD = ${CURRENCIES.filter((c) => c !== "USD").map((c) => `${rateNum(rates[c])} ${c}`).join(" · ")}`;
