import { intlLocale, type Locale } from "@/lib/i18n/dict";
import type { Currency } from "@/lib/currency";

export const money = (n: number, currency: Currency, locale: Locale) =>
  new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency }).format(n);

export const fmtDate = (iso: string, locale: Locale) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });
};

/** Link target for a user-typed URL: bare domains get https://, anything that is not http(s) is dropped. */
export const safeHref = (url: string | null): string | null => {
  const v = url?.trim();
  if (!v) return null;
  const href = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  return /^https?:\/\//i.test(href) ? href : null;
};
