import Link from "next/link";
import { notFound } from "next/navigation";
import { loadData } from "@/lib/data";
import { deleteTransfer, updateTransfer } from "../../../actions";
import { AmountFields, Card, Field, PageHeader, RateDetails, RateSelect, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function TransferPage(props: PageProps<"/partners/transfers/[id]">) {
  const { id } = await props.params;
  const { transfers, partners, rateSets, rateSetFor, rateUsage, canWrite } = await loadData();
  const x = transfers.find((r) => r.id === id);
  if (!x) notFound();
  const { t } = await getT();
  const cur = await getDisplayCurrency();
  const set = rateSetFor(x);
  const name = (pid: string) => partners.find((p) => p.id === pid)?.name ?? "?";

  return (
    <>
      <Link href="/partners" className="mb-3 inline-block text-sm text-zinc-500 underline">{t("par.back")}</Link>
      <PageHeader title={t("par.owesLine", { from: name(x.from_partner), to: name(x.to_partner), amount: "" }).trim()} subtitle={t("exp.detailSub")} />
      <RateDetails amount={x.amount} currency={x.currency} display={cur} rateSet={set} sharedBy={set ? rateUsage.get(set.id) ?? 0 : 0} />

      <Card title={canWrite ? t("common.edit") : undefined}>
        <form action={updateTransfer} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={x.id} />
          <fieldset disabled={!canWrite} className="contents">
            <Field label={t("par.whoOwes")}>
              <select name="from_partner" required defaultValue={x.from_partner} className={inputCls}>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </Field>
            <Field label={t("par.owesTo")}>
              <select name="to_partner" required defaultValue={x.to_partner} className={inputCls}>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </Field>
            <AmountFields min="0.01" amount={x.amount} currency={x.currency} />
            <RateSelect rateSets={rateSets} value={set?.id} />
            <Field label={t("common.date")}><input name="date" type="date" required defaultValue={x.date} className={inputCls} /></Field>
            <Field label={t("common.note")} className="sm:col-span-2"><input name="note" defaultValue={x.note ?? ""} className={inputCls} /></Field>
          </fieldset>
          {canWrite && <div><button className={btnCls}>{t("common.save")}</button></div>}
        </form>
        {canWrite && (
          <form action={deleteTransfer} className="mt-4"><input type="hidden" name="id" value={x.id} /><button className={linkBtnCls}>{t("common.delete")}</button></form>
        )}
      </Card>
    </>
  );
}
