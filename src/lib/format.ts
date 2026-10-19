import { intlLocale, type Locale } from "@/lib/i18n/dict";
import type { Currency } from "@/lib/currency";

export const money = (n: number, currency: Currency, locale: Locale) =>
  new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency }).format(n);

export const fmtDate = (iso: string, locale: Locale) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });
};
