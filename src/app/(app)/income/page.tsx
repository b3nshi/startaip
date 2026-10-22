import Link from "next/link";
import { loadData } from "@/lib/data";
import { addIncome, deleteIncome } from "../actions";
import { AmountFields, Card, Field, PageHeader, RecurrenceFields, ServiceSelect, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { intervalLabel, nextCharge } from "@/lib/recurrence";
import { fmtDate, money } from "@/lib/format";
import { convert } from "@/lib/currency";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function IncomePage() {
  const { income, rates, services, canWrite } = await loadData();
  const { t, locale } = await getT();
  const cur = await getDisplayCurrency();
  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  return (
    <>
      <PageHeader title={t("inc.title")} subtitle={t("inc.subtitle")} />
      {canWrite && <Card title={t("inc.add")} className="mb-6">
        <form action={addIncome} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("inc.desc")}><input name="description" required placeholder={t("inc.descPh")} className={inputCls} /></Field>
          <AmountFields />
          <ServiceSelect services={services} />
          <RecurrenceFields />
          <div><button className={btnCls}>{t("inc.addBtn")}</button></div>
        </form>
      </Card>}
      <Card>
        {income.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("inc.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr><th className="pb-2">{t("inc.desc")}</th><th>{t("rec.repeats")}</th><th>{t("inc.next")}</th><th className="text-right">{t("common.amount")}</th><th /></tr>
              </thead>
              <tbody>
                {income.map((i) => {
                  const next = nextCharge(i);
                  return (
                    <tr key={i.id} className="border-t border-zinc-100">
                      <td className="py-2">
                        <div className="font-medium">{i.description}</div>
                        {i.service_id && serviceName.has(i.service_id) && <Link href={`/services/${i.service_id}`} className="text-xs text-zinc-500 underline">{serviceName.get(i.service_id)}</Link>}
                      </td>
                      <td>{intervalLabel(i.interval_months, t)}</td>
                      <td>{next ? fmtDate(next, locale) : i.interval_months ? t("exp.ended") : fmtDate(i.start_date, locale)}</td>
                      <td className="text-right tabular-nums">
                        <div>{money(i.amount, i.currency, locale)}</div>
                        {i.currency !== cur && <div className="text-xs text-zinc-400">≈ {money(convert(i.amount, i.currency, cur, rates), cur, locale)}</div>}
                      </td>
                      <td className="pl-3 text-right">
                        {canWrite && <form action={deleteIncome}><input type="hidden" name="id" value={i.id} /><button className={linkBtnCls}>{t("common.delete")}</button></form>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
