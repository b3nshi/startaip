import type { ReactNode } from "react";
import { CURRENCIES } from "@/lib/currency";
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
export async function AmountFields({ min = "0" }: { min?: string }) {
  const { t } = await getT();
  return (
    <>
      <Field label={t("common.amount")}><input name="amount" type="number" step="0.01" min={min} required className={inputCls} /></Field>
      <Field label={t("common.currency")}>
        <select name="currency" defaultValue="USD" className={inputCls}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
      </Field>
    </>
  );
}

/** Recurrence picker shared by expenses and income. */
export async function RecurrenceFields({ includeVariable = false }: { includeVariable?: boolean }) {
  const { t } = await getT();
  return (
    <>
      <Field label={t("rec.repeats")}>
        <select name="interval" defaultValue="0" className={inputCls}>
          <option value="0">{t("rec.oneTime")}</option>
          <option value="1">{t("rec.monthly")}</option>
          <option value="3">{t("rec.quarterly")}</option>
          <option value="12">{t("rec.yearly")}</option>
          <option value="24">{t("rec.every2Years")}</option>
          <option value="custom">{t("rec.customOpt")}</option>
        </select>
      </Field>
      <Field label={t("rec.customN")}>
        <input name="custom_interval" type="number" min={1} placeholder="18" className={inputCls} />
      </Field>
      <Field label={t("rec.start")}>
        <input name="start_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
      </Field>
      <Field label={t("rec.ends")}>
        <input name="end_date" type="date" className={inputCls} />
      </Field>
      {includeVariable && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input name="is_variable" type="checkbox" /> {t("rec.variable")}
        </label>
      )}
    </>
  );
}
