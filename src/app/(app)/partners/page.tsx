import { loadData } from "@/lib/data";
import { addPartner, addTransfer, deletePartner, deleteTransfer } from "../actions";
import { AmountFields, Card, Field, PageHeader, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { computeBalances, settlements } from "@/lib/balances";
import { occurrences, todayISO } from "@/lib/recurrence";
import { fmtDate, money } from "@/lib/format";
import { convert } from "@/lib/currency";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function PartnersPage() {
  const { partners, expenses, actuals, transfers, rates, canWrite } = await loadData();
  const { t, locale } = await getT();
  const cur = await getDisplayCurrency();
  const m = (n: number) => money(n, cur, locale);
  const today = todayISO();

  // Everything is converted to the display currency before comparing partners.
  const spentBy = new Map<string, number>();
  for (const e of expenses) {
    const total = occurrences(e, today, actuals).reduce((a, o) => a + convert(o.amount, e.currency, cur, rates), 0);
    spentBy.set(e.paid_by, (spentBy.get(e.paid_by) ?? 0) + total);
  }
  const converted = transfers.map((x) => ({ ...x, amount: convert(x.amount, x.currency, cur, rates) }));
  const { balances, total, pct } = computeBalances(partners, spentBy, converted);
  const plan = settlements(balances);
  const name = new Map(partners.map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader title={t("par.title")} subtitle={t("par.subtitle", { total: m(total), cur })} />

      <Card title={t("par.balances")} className="mb-6">
        {balances.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("par.addFirst")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="pb-2">{t("par.partner")}</th><th className="text-right">{t("par.paid")}</th><th className="text-right">{t("par.owedToThem")}</th>
                  <th className="text-right">{t("par.theyOwe")}</th><th className="text-right">{t("par.invested")}</th><th className="text-right">{t("par.share")}</th><th className="text-right">{t("par.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.partner.id} className="border-t border-zinc-100">
                    <td className="py-2"><div className="font-medium">{b.partner.name}</div><div className="text-xs text-zinc-500">{t("par.equity", { pct: pct(b.partner).toFixed(0) })}</div></td>
                    <td className="text-right tabular-nums">{m(b.paid)}</td>
                    <td className="text-right tabular-nums">{m(b.credits)}</td>
                    <td className="text-right tabular-nums">{m(b.debts)}</td>
                    <td className="text-right font-medium tabular-nums">{m(b.invested)}</td>
                    <td className="text-right tabular-nums">{m(b.share)}</td>
                    <td className={`text-right font-medium tabular-nums ${b.net >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {b.net >= 0 ? "+" : ""}{m(b.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-zinc-500">{t("par.balanceHelp")}</p>
          </div>
        )}
        {plan.length > 0 && (
          <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm">
            <div className="mb-1 text-xs font-semibold text-zinc-500">{t("par.toEvenOut")}</div>
            {plan.map((s, i) => <div key={i}>{t("par.owesLine", { from: s.from.name, to: s.to.name, amount: m(s.amount) })}</div>)}
          </div>
        )}
      </Card>

      <Card title={t("par.recordTitle")} className="mb-6">
        {canWrite && <p className="mb-3 text-sm text-zinc-500">{t("par.recordHelp")}</p>}
        {!canWrite ? null : partners.length < 2 ? (
          <p className="text-sm text-zinc-500">{t("par.needTwo")}</p>
        ) : (
          <form action={addTransfer} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("par.whoOwes")}>
              <select name="from_partner" required className={inputCls}>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </Field>
            <Field label={t("par.owesTo")}>
              <select name="to_partner" required defaultValue={partners[1].id} className={inputCls}>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </Field>
            <AmountFields min="0.01" />
            <Field label={t("common.date")}><input name="date" type="date" required defaultValue={today} className={inputCls} /></Field>
            <Field label={t("common.note")} className="sm:col-span-2"><input name="note" placeholder={t("par.notePh")} className={inputCls} /></Field>
            <div><button className={btnCls}>{t("par.record")}</button></div>
          </form>
        )}
        {transfers.length > 0 && (
          <ul className="mt-4 divide-y divide-zinc-100 text-sm">
            {transfers.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                <span>{fmtDate(x.date, locale)} · {t("par.owesLine", { from: name.get(x.from_partner) ?? "?", to: name.get(x.to_partner) ?? "?", amount: money(x.amount, x.currency, locale) })}{x.note && <span className="text-zinc-500"> — {x.note}</span>}</span>
                {canWrite && <form action={deleteTransfer}><input type="hidden" name="id" value={x.id} /><button className={linkBtnCls}>{t("common.delete")}</button></form>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t("par.manage")}>
        {canWrite && <p className="mb-3 text-sm text-zinc-500">{t("par.manageHelp")}</p>}
        {canWrite && <form action={addPartner} className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("common.name")}><input name="name" required className={inputCls} /></Field>
          <Field label={t("common.email")}><input name="email" type="email" className={inputCls} /></Field>
          <Field label={t("par.equityLbl")}><input name="equity_pct" type="number" step="0.01" min="0" max="100" className={inputCls} /></Field>
          <div className="self-end"><button className={btnCls}>{t("par.addPartner")}</button></div>
        </form>}
        <ul className="divide-y divide-zinc-100 text-sm">
          {partners.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{p.name} {p.email && <span className="text-zinc-500">{p.email}</span>}</span>
              {canWrite && <form action={deletePartner}><input type="hidden" name="id" value={p.id} /><button className={linkBtnCls}>{t("common.remove")}</button></form>}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
