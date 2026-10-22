import Link from "next/link";
import { loadData } from "@/lib/data";
import { addCashIn, deleteCashIn } from "../actions";
import { AmountFields, Card, Field, PageHeader, RateHint, RateSelect, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { todayISO } from "@/lib/recurrence";
import { fmtDate, money } from "@/lib/format";
import { convert } from "@/lib/currency";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";
import { SubmitButton } from "@/components/submit-button";

export default async function CashInPage() {
  const { partners, cashIns, rateSets, rateSetFor, ratesFor, canWrite } = await loadData();
  const { t, locale } = await getT();
  const cur = await getDisplayCurrency();
  const name = new Map(partners.map((p) => [p.id, p.name]));

  const byPartner = new Map<string, number>();
  for (const c of cashIns) byPartner.set(c.contributed_by, (byPartner.get(c.contributed_by) ?? 0) + convert(c.amount, c.currency, cur, ratesFor(c)));
  const total = [...byPartner.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title={t("cash.title")} subtitle={t("cash.subtitle")} />

      {canWrite && <Card title={t("cash.add")} className="mb-6">
        {partners.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("cash.needPartner")}</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-zinc-500">{t("cash.help")}</p>
            <form action={addCashIn} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t("cash.contributedBy")}>
                <select name="contributed_by" required className={inputCls}>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </Field>
              <Field label={t("cash.receivedBy")}>
                <select name="received_by" defaultValue="" className={inputCls}>
                  <option value="">{t("cash.toCompany")}</option>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label={t("common.date")}><input name="date" type="date" required defaultValue={todayISO()} className={inputCls} /></Field>
              <AmountFields min="0.01" />
              <RateSelect rateSets={rateSets} />
              <Field label={t("cash.method")}><input name="method" placeholder={t("cash.methodPh")} className={inputCls} /></Field>
              <Field label={t("cash.concept")} className="sm:col-span-2 lg:col-span-3"><input name="concept" required placeholder={t("cash.conceptPh")} className={inputCls} /></Field>
              <div><SubmitButton className={btnCls}>{t("cash.addBtn")}</SubmitButton></div>
            </form>
          </>
        )}
      </Card>}

      {cashIns.length > 0 && (
        <Card title={`${t("cash.byPartner")} · ${t("cash.totalIn")} ${money(total, cur, locale)}`} className="mb-6">
          <ul className="divide-y divide-zinc-100 text-sm">
            {[...byPartner].sort((a, b) => b[1] - a[1]).map(([id, amount]) => (
              <li key={id} className="flex justify-between py-2"><span>{name.get(id) ?? "?"}</span><span className="tabular-nums">{money(amount, cur, locale)}</span></li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={t("cash.history")}>
        {cashIns.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("cash.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr><th className="pb-2">{t("common.date")}</th><th>{t("cash.concept")}</th><th>{t("cash.contributedBy")} → {t("cash.receivedBy")}</th><th>{t("cash.method")}</th><th className="text-right">{t("common.amount")}</th><th /></tr>
              </thead>
              <tbody>
                {cashIns.map((c) => (
                  <tr key={c.id} className="border-t border-zinc-100 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(c.date, locale)}</td>
                    <td className="pr-3 font-medium">{c.concept}</td>
                    <td className="pr-3">{t("cash.line", { from: name.get(c.contributed_by) ?? "?", to: c.received_by ? name.get(c.received_by) ?? "?" : t("cash.toCompany") })}</td>
                    <td className="pr-3 text-zinc-500">{c.method ?? "—"}</td>
                    <td className="text-right tabular-nums">
                      <div>{money(c.amount, c.currency, locale)}</div>
                      {c.currency !== cur && <div className="text-xs text-zinc-400">≈ {money(convert(c.amount, c.currency, cur, ratesFor(c)), cur, locale)}</div>}
                      <RateHint from={c.currency} to={cur} rateSet={rateSetFor(c)} />
                    </td>
                    <td className="pl-3 text-right whitespace-nowrap">
                      <Link href={`/cash-in/${c.id}`} className="mr-3 text-xs text-zinc-500 underline">{t("common.details")}</Link>
                      {canWrite && <form action={deleteCashIn} className="inline"><input type="hidden" name="id" value={c.id} /><SubmitButton className={linkBtnCls}>{t("common.delete")}</SubmitButton></form>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
