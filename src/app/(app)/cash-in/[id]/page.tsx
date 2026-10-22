import Link from "next/link";
import { notFound } from "next/navigation";
import { loadData } from "@/lib/data";
import { deleteCashIn, updateCashIn } from "../../actions";
import { AmountFields, Card, Field, PageHeader, RateDetails, RateSelect, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function CashInDetailPage(props: PageProps<"/cash-in/[id]">) {
  const { id } = await props.params;
  const { cashIns, partners, rateSets, rateSetFor, rateUsage, canWrite } = await loadData();
  const c = cashIns.find((x) => x.id === id);
  if (!c) notFound();
  const { t } = await getT();
  const cur = await getDisplayCurrency();
  const set = rateSetFor(c);

  return (
    <>
      <Link href="/cash-in" className="mb-3 inline-block text-sm text-zinc-500 underline">{t("cash.back")}</Link>
      <PageHeader title={c.concept} subtitle={t("exp.detailSub")} />
      <RateDetails amount={c.amount} currency={c.currency} display={cur} rateSet={set} sharedBy={set ? rateUsage.get(set.id) ?? 0 : 0} />

      <Card title={canWrite ? t("common.edit") : undefined}>
        <form action={updateCashIn} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={c.id} />
          <fieldset disabled={!canWrite} className="contents">
            <Field label={t("cash.contributedBy")}>
              <select name="contributed_by" required defaultValue={c.contributed_by} className={inputCls}>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </Field>
            <Field label={t("cash.receivedBy")}>
              <select name="received_by" defaultValue={c.received_by ?? ""} className={inputCls}>
                <option value="">{t("cash.toCompany")}</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label={t("common.date")}><input name="date" type="date" required defaultValue={c.date} className={inputCls} /></Field>
            <AmountFields min="0.01" amount={c.amount} currency={c.currency} />
            <RateSelect rateSets={rateSets} value={set?.id} />
            <Field label={t("cash.method")}><input name="method" defaultValue={c.method ?? ""} className={inputCls} /></Field>
            <Field label={t("cash.concept")} className="sm:col-span-2 lg:col-span-3"><input name="concept" required defaultValue={c.concept} className={inputCls} /></Field>
          </fieldset>
          {canWrite && <div><button className={btnCls}>{t("common.save")}</button></div>}
        </form>
        {canWrite && (
          <form action={deleteCashIn} className="mt-4"><input type="hidden" name="id" value={c.id} /><button className={linkBtnCls}>{t("common.delete")}</button></form>
        )}
      </Card>
    </>
  );
}
