import Link from "next/link";
import { notFound } from "next/navigation";
import { loadData } from "@/lib/data";
import { deleteExpense, updateExpense } from "../../actions";
import { AmountFields, Card, Field, OccurrenceRates, PageHeader, RateDetails, RateSelect, RecurrenceFields, ServiceSelect, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { occurrences, todayISO } from "@/lib/recurrence";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function ExpensePage(props: PageProps<"/expenses/[id]">) {
  const { id } = await props.params;
  const { expenses, partners, services, rateSets, rateSetFor, rateUsage, actuals, canWrite } = await loadData();
  const e = expenses.find((x) => x.id === id);
  if (!e) notFound();
  const { t } = await getT();
  const cur = await getDisplayCurrency();
  const today = todayISO();
  const byDate = e.rate_mode === "by_date";
  const set = rateSetFor(e, today);
  const rows = byDate && e.interval_months ? occurrences(e, today, actuals).reverse().slice(0, 24).map((o) => ({ ...o, set: rateSetFor(e, o.date) })) : [];

  return (
    <>
      <Link href="/expenses" className="mb-3 inline-block text-sm text-zinc-500 underline">{t("exp.back")}</Link>
      <PageHeader title={e.name} subtitle={t("exp.detailSub")} />
      <RateDetails amount={e.amount} currency={e.currency} display={cur} rateSet={set} sharedBy={set ? rateUsage.get(set.id) ?? 0 : 0} byDate={byDate} />
      <OccurrenceRates rows={rows} currency={e.currency} display={cur} />

      <Card title={canWrite ? t("common.edit") : undefined}>
        <form action={updateExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={e.id} />
          <fieldset disabled={!canWrite} className="contents">
            <Field label={t("common.name")}><input name="name" required defaultValue={e.name} className={inputCls} /></Field>
            <Field label={t("common.category")}><input name="category" defaultValue={e.category ?? ""} className={inputCls} /></Field>
            <AmountFields amount={e.amount} currency={e.currency} />
            <Field label={t("common.paidBy")}>
              <select name="paid_by" required defaultValue={e.paid_by} className={inputCls}>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <ServiceSelect services={services} value={e.service_id} />
            <RateSelect rateSets={rateSets} value={byDate ? e.rate_set_id : set?.id} mode={e.rate_mode} withMode />
            <RecurrenceFields includeVariable value={e} />
            <Field label={t("common.notes")} className="sm:col-span-2 lg:col-span-3"><input name="notes" defaultValue={e.notes ?? ""} className={inputCls} /></Field>
          </fieldset>
          {canWrite && <div><button className={btnCls}>{t("common.save")}</button></div>}
        </form>
        {canWrite && (
          <form action={deleteExpense} className="mt-4"><input type="hidden" name="id" value={e.id} /><button className={linkBtnCls}>{t("common.delete")}</button></form>
        )}
      </Card>
    </>
  );
}
