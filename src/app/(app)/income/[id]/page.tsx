import Link from "next/link";
import { notFound } from "next/navigation";
import { loadData } from "@/lib/data";
import { deleteIncome, updateIncome } from "../../actions";
import { AmountFields, Card, Field, OccurrenceRates, PageHeader, RateDetails, RateSelect, RecurrenceFields, ServiceSelect, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { occurrences, todayISO } from "@/lib/recurrence";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";
import { SubmitButton } from "@/components/submit-button";

export default async function IncomeDetailPage(props: PageProps<"/income/[id]">) {
  const { id } = await props.params;
  const { income, services, rateSets, rateSetFor, rateUsage, canWrite } = await loadData();
  const i = income.find((x) => x.id === id);
  if (!i) notFound();
  const { t } = await getT();
  const cur = await getDisplayCurrency();
  const today = todayISO();
  const byDate = i.rate_mode === "by_date";
  const set = rateSetFor(i, today);
  const rows = byDate && i.interval_months ? occurrences(i, today).reverse().slice(0, 24).map((o) => ({ ...o, set: rateSetFor(i, o.date) })) : [];

  return (
    <>
      <Link href="/income" className="mb-3 inline-block text-sm text-zinc-500 underline">{t("inc.back")}</Link>
      <PageHeader title={i.description} subtitle={t("exp.detailSub")} />
      <RateDetails amount={i.amount} currency={i.currency} display={cur} rateSet={set} sharedBy={set ? rateUsage.get(set.id) ?? 0 : 0} byDate={byDate} />
      <OccurrenceRates rows={rows} currency={i.currency} display={cur} />

      <Card title={canWrite ? t("common.edit") : undefined}>
        <form action={updateIncome} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={i.id} />
          <fieldset disabled={!canWrite} className="contents">
            <Field label={t("inc.desc")}><input name="description" required defaultValue={i.description} className={inputCls} /></Field>
            <AmountFields amount={i.amount} currency={i.currency} />
            <ServiceSelect services={services} value={i.service_id} />
            <RateSelect rateSets={rateSets} value={byDate ? i.rate_set_id : set?.id} mode={i.rate_mode} withMode />
            <RecurrenceFields value={i} />
          </fieldset>
          {canWrite && <div><SubmitButton className={btnCls}>{t("common.save")}</SubmitButton></div>}
        </form>
        {canWrite && (
          <form action={deleteIncome} className="mt-4"><input type="hidden" name="id" value={i.id} /><SubmitButton className={linkBtnCls}>{t("common.delete")}</SubmitButton></form>
        )}
      </Card>
    </>
  );
}
