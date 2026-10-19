"use client";

import { useTransition } from "react";
import { setCurrency, setLang } from "@/app/prefs-actions";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { LOCALES, type Locale } from "@/lib/i18n/dict";
import { useI18n } from "@/lib/i18n/client";

const sel = "rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs";

export function LangSwitcher() {
  const { locale, t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <select aria-label={t("common.language")} value={locale} disabled={pending} className={sel}
      onChange={(e) => start(() => setLang(e.target.value))}>
      {LOCALES.map((l: Locale) => <option key={l} value={l}>{l === "en" ? "English" : "Español"}</option>)}
    </select>
  );
}

export function CurrencySwitcher({ current }: { current: Currency }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <select aria-label={t("common.displayCurrency")} title={t("common.displayCurrency")} value={current} disabled={pending} className={sel}
      onChange={(e) => start(() => setCurrency(e.target.value))}>
      {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
    </select>
  );
}
