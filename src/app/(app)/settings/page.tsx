import { loadData } from "@/lib/data";
import { addRateSet, deleteRateSet, saveNotificationPrefs, updateRateSet } from "../actions";
import { Card, Field, PageHeader, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { CURRENCIES, type Rates } from "@/lib/currency";
import { fmtDate } from "@/lib/format";
import { todayISO } from "@/lib/recurrence";
import { getCompanyCtx } from "@/lib/company";
import { NOTIFY_CATEGORIES } from "@/lib/notifications";
import { getT } from "@/lib/i18n/server";
import { SubmitButton } from "@/components/submit-button";

const OTHERS = CURRENCIES.filter((c) => c !== "USD");

async function RateInputs({ rates, disabled }: { rates?: Rates; disabled?: boolean }) {
  const { t } = await getT();
  return (
    <>
      {OTHERS.map((c) => (
        <Field key={c} label={t("set.perUsd", { cur: c })}>
          <input name={c} type="number" step="any" min="0.000001" required defaultValue={rates?.[c]} disabled={disabled} className={inputCls} />
        </Field>
      ))}
    </>
  );
}

export default async function SettingsPage() {
  const { rateSets, rateUsage, canWrite } = await loadData();
  const { t, locale } = await getT();
  const latest = rateSets[0];
  const { supabase, me, company } = await getCompanyCtx();
  const { data: prefs } = await supabase.from("notification_prefs").select("muted").eq("company_id", company.id).eq("user_id", me.id).maybeSingle();
  const muted = new Set<string>(prefs?.muted ?? []);
  return (
    <>
      <PageHeader title={t("set.title")} subtitle={t("set.subtitle")} />

      <Card title={t("notif.title")} className="mb-6">
        <p className="mb-3 text-sm text-zinc-500">{t("notif.help")}</p>
        <form action={saveNotificationPrefs} className="space-y-2 text-sm">
          {NOTIFY_CATEGORIES.map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" name="notify" value={k} defaultChecked={!muted.has(k)} /> {t(`notif.${k}`)}
            </label>
          ))}
          <div className="pt-2"><SubmitButton className={btnCls}>{t("common.save")}</SubmitButton></div>
        </form>
      </Card>

      {canWrite && (
        <Card title={t("rate.add")} className="mb-6">
          <p className="mb-3 text-sm text-zinc-500">{t("rate.addHelp")}</p>
          <form action={addRateSet} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("common.date")}><input name="effective_date" type="date" required defaultValue={todayISO()} className={inputCls} /></Field>
            <RateInputs rates={latest?.rates} />
            <Field label={t("common.note")} className="sm:col-span-2 lg:col-span-4"><input name="note" placeholder={t("rate.notePh")} className={inputCls} /></Field>
            <div><SubmitButton className={btnCls}>{t("rate.addBtn")}</SubmitButton></div>
          </form>
        </Card>
      )}

      <Card title={t("rate.history")} className="scroll-mt-4">
        <div id="rates" />
        <p className="mb-4 text-sm text-zinc-500">{t("rate.historyHelp")}</p>
        <ul className="space-y-4">
          {rateSets.map((r, i) => {
            const used = rateUsage.get(r.id) ?? 0;
            return (
              <li key={r.id} id={`rate-${r.id}`} className="scroll-mt-4 rounded-xl border border-zinc-200 p-4 target:border-zinc-900">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{fmtDate(r.effective_date, locale)}{i === 0 && <span className="ml-2 rounded bg-zinc-900 px-1.5 py-0.5 text-xs font-normal text-white">{t("rate.latest")}</span>}</span>
                  <span className="text-xs text-zinc-500">{t("rate.usedBy", { n: used })}</span>
                </div>
                <form action={updateRateSet} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="hidden" name="id" value={r.id} />
                  <Field label={t("common.date")}><input name="effective_date" type="date" required defaultValue={r.effective_date} disabled={!canWrite} className={inputCls} /></Field>
                  <RateInputs rates={r.rates} disabled={!canWrite} />
                  <Field label={t("common.note")} className="sm:col-span-2 lg:col-span-4"><input name="note" defaultValue={r.note ?? ""} disabled={!canWrite} className={inputCls} /></Field>
                  {canWrite && <div><SubmitButton className={btnCls}>{t("common.save")}</SubmitButton></div>}
                </form>
                {canWrite && (
                  <div className="mt-2 flex items-center gap-3">
                    {used > 0 && <span className="text-xs text-zinc-500">{t("rate.editWarn", { n: used })}</span>}
                    <form action={deleteRateSet} className="ml-auto">
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton className={linkBtnCls} disabled={used > 0} title={used > 0 ? t("err.rateInUse") : undefined}>{t("common.delete")}</SubmitButton>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
