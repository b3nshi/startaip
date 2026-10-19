import { cookies, headers } from "next/headers";
import { LOCALES, makeT, type Locale } from "./dict";
import { CURRENCIES, isCurrency, type Currency } from "@/lib/currency";

/** Cookie choice wins; otherwise the browser's preferred language; otherwise English. */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get("lang")?.value;
  if (LOCALES.includes(saved as Locale)) return saved as Locale;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (LOCALES.includes(code as Locale)) return code as Locale;
  }
  return "en";
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}

/** Currency used to show totals. */
export async function getDisplayCurrency(): Promise<Currency> {
  const saved = (await cookies()).get("cur")?.value;
  return isCurrency(saved) ? saved : CURRENCIES[0];
}
