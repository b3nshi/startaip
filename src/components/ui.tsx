import type { ReactNode } from "react";
import Link from "next/link";
import { CURRENCIES, convert, rateLabel, type Currency, type RateMode, type RateSet } from "@/lib/currency";
import { fmtDate, money, rateSetLabel } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const inputCls = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900";
export const btnCls = "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700";
export const linkBtnCls = "text-xs text-zinc-400 hover:text-red-600";

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-zinc-200 bg-white p-5 ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-zinc-500">{title}</h2>}
      {children}
    </section>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </header>
  );
}

/** Amount + currency inputs. */
export async function AmountFields({ min = "0", amount, currency = "USD" }: { min?: string; amount?: number; currency?: Currency }) {
  const { t } = await getT();
  return (
    <>
      <Field label={t("common.amount")}><input name="amount" type="number" step="0.01" min={min} required defaultValue={amount} className={inputCls} /></Field>
      <Field label={t("common.currency")}>
        <select name="currency" defaultValue={currency} className={inputCls}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
      </Field>
    </>
  );
}

/** Recurrence picker shared by expenses and income. */
export async function RecurrenceFields({ includeVariable = false, value }: {
  includeVariable?: boolean;
  value?: { interval_months: number | null; start_date: string; end_date: string | null; is_variable?: boolean };
}) {
  const { t } = await getT();
  const months = value?.interval_months ?? 0;
  const preset = [0, 1, 3, 12, 24].includes(months);
  return (
    <>
      <Field label={t("rec.repeats")}>
        <select name="interval" defaultValue={preset ? String(months) : "custom"} className={inputCls}>
          <option value="0">{t("rec.oneTime")}</option>
          <option value="1">{t("rec.monthly")}</option>
          <option value="3">{t("rec.quarterly")}</option>
          <option value="12">{t("rec.yearly")}</option>
          <option value="24">{t("rec.every2Years")}</option>
          <option value="custom">{t("rec.customOpt")}</option>
        </select>
      </Field>
      <Field label={t("rec.customN")}>
        <input name="custom_interval" type="number" min={1} placeholder="18" defaultValue={preset ? undefined : months} className={inputCls} />
      </Field>
      <Field label={t("rec.start")}>
        <input name="start_date" type="date" required defaultValue={value?.start_date ?? new Date().toISOString().slice(0, 10)} className={inputCls} />
      </Field>
      <Field label={t("rec.ends")}>
        <input name="end_date" type="date" defaultValue={value?.end_date ?? undefined} className={inputCls} />
      </Field>
      {includeVariable && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input name="is_variable" type="checkbox" defaultChecked={value?.is_variable} /> {t("rec.variable")}
        </label>
      )}
    </>
  );
}

/** Optional link to a service, for expense and income forms. */
export async function ServiceSelect({ services, value }: { services: { id: string; name: string }[]; value?: string | null }) {
  const { t } = await getT();
  return (
    <Field label={t("svc.label")}>
      <select name="service_id" defaultValue={value ?? ""} className={inputCls}>
        <option value="">{t("svc.noService")}</option>
        {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </Field>
  );
}

/** Which exchange rates a record converts with. Defaults to the newest set; older sets are the history. */
export async function RateSelect({ rateSets, value, mode, withMode = false, className = "" }: {
  rateSets: RateSet[]; value?: string; mode?: RateMode; withMode?: boolean; className?: string;
}) {
  const { t, locale } = await getT();
  return (
    <>
    {withMode && (
      <Field label={t("rate.mode")}>
        <select name="rate_mode" defaultValue={mode ?? "fixed"} className={inputCls}>
          <option value="fixed">{t("rate.modeFixed")}</option>
          <option value="by_date">{t("rate.modeByDate")}</option>
        </select>
      </Field>
    )}
    <Field label={t(withMode ? "rate.labelFixed" : "rate.label")} className={className}>
      <select name="rate_set_id" defaultValue={value ?? rateSets[0]?.id} className={inputCls}>
        {rateSets.map((r, i) => <option key={r.id} value={r.id}>{rateSetLabel(r, locale)}{i === 0 ? ` · ${t("rate.latest")}` : ""}</option>)}
      </select>
      <Link href="/settings#rates" className="text-xs text-zinc-400 underline">{t("rate.manage")}</Link>
    </Field>
    </>
  );
}

/** Explains where a converted figure comes from: the amount, the rate set used, and how many other records share it. */
export async function RateDetails({ amount, currency, display, rateSet, sharedBy, byDate = false }: {
  amount: number; currency: Currency; display: Currency; rateSet: RateSet | undefined; sharedBy: number; byDate?: boolean;
}) {
  const { t, locale } = await getT();
  if (!rateSet) return null;
  return (
    <Card title={t("rate.title")} className="mb-6">
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-medium text-zinc-500">{byDate ? t("rate.usedToday") : t("rate.used")}</dt><dd className="mt-0.5">{rateSetLabel(rateSet, locale)}</dd></div>
        <div>
          <dt className="text-xs font-medium text-zinc-500">{t("rate.conversion", { cur: display })}</dt>
          <dd className="mt-0.5 tabular-nums">
            {currency === display
              ? <>{money(amount, currency, locale)} <span className="text-zinc-500">— {t("rate.sameCurrency")}</span></>
              : <>{money(amount, currency, locale)} → {money(convert(amount, currency, display, rateSet.rates), display, locale)} <span className="text-zinc-500">({rateLabel(currency, display, rateSet.rates)})</span></>}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-500">
        {byDate ? t("rate.byDateNote") : t("rate.shared", { n: sharedBy })}{" "}
        <Link href={`/settings#rate-${rateSet.id}`} className="underline">{t("rate.editSet")}</Link>
      </p>
    </Card>
  );
}

/** Small "1 USD = 1,200 ARS" line under a converted amount in a list. */
export function RateHint({ from, to, rateSet }: { from: Currency; to: Currency; rateSet: RateSet | undefined }) {
  if (!rateSet || from === to) return null;
  return <div className="text-xs text-zinc-400">{rateLabel(from, to, rateSet.rates)}</div>;
}

export type OccurrenceRow = { date: string; amount: number; estimated: boolean; set: RateSet | undefined };

/** Each charge of a recurring record with the rate set that converted it (for records that follow the charge date). */
export async function OccurrenceRates({ rows, currency, display }: { rows: OccurrenceRow[]; currency: Currency; display: Currency }) {
  const { t, locale } = await getT();
  if (!rows.length) return null;
  return (
    <Card title={t("rate.byCharge")} className="mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-500"><tr><th className="pb-2">{t("common.date")}</th><th>{t("rate.used")}</th><th className="text-right">{t("common.amount")}</th><th className="text-right">{t("rate.conversion", { cur: display })}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-t border-zinc-100">
                <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(r.date, locale)}</td>
                <td className="pr-3 text-xs text-zinc-500">{r.set ? <Link href={`/settings#rate-${r.set.id}`} className="underline">{rateSetLabel(r.set, locale)}</Link> : "—"}</td>
                <td className="text-right tabular-nums">{r.estimated && "~"}{money(r.amount, currency, locale)}</td>
                <td className="text-right tabular-nums">{r.set ? money(convert(r.amount, currency, display, r.set.rates), display, locale) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
