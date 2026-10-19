export const CURRENCIES = ["USD", "EUR", "ARS"] as const;
export type Currency = (typeof CURRENCIES)[number];
/** Units of each currency per 1 USD. */
export type Rates = Record<Currency, number>;

export const DEFAULT_RATES: Rates = { USD: 1, EUR: 0.92, ARS: 1000 };

export const isCurrency = (v: unknown): v is Currency => CURRENCIES.includes(v as Currency);

export function convert(amount: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return amount;
  return (amount / rates[from]) * rates[to];
}
