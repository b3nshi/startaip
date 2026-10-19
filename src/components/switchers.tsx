"use client";

import { useTransition } from "react";
import Link from "next/link";
import { setCurrency, setLang } from "@/app/prefs-actions";
import { setCompany } from "@/app/company-actions";
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

export function CompanySwitcher({ companies, currentId }: { companies: { id: string; name: string }[]; currentId: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-1">
      <select aria-label={t("co.switch")} value={currentId} disabled={pending} className={`${sel} w-full`}
        onChange={(e) => start(() => setCompany(e.target.value))}>
        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Link href="/companies/new" className="block text-xs text-zinc-500 underline">+ {t("co.new")}</Link>
    </div>
  );
}
