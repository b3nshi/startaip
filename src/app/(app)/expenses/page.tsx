import { loadData } from "@/lib/data";
import { addExpense, deleteExpense, logActual } from "../actions";
import { AmountFields, Card, Field, PageHeader, RecurrenceFields, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { intervalLabel, nextCharge, todayISO } from "@/lib/recurrence";
import { fmtDate, money } from "@/lib/format";
import { convert } from "@/lib/currency";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function ExpensesPage() {
  const { partners, expenses, actuals, rates } = await loadData();
  const { t, locale } = await getT();
  const cur = await getDisplayCurrency();
  const name = new Map(partners.map((p) => [p.id, p.name]));
  const thisMonth = todayISO().slice(0, 7);

  return (
    <>
      <PageHeader title={t("exp.title")} subtitle={t("exp.subtitle")} />

      <Card title={t("exp.add")} className="mb-6">
        {partners.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("exp.addPartnerFirst")}</p>
        ) : (
          <form action={addExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("common.name")}><input name="name" required placeholder={t("exp.namePh")} className={inputCls} /></Field>
            <Field label={t("common.category")}><input name="category" placeholder={t("exp.catPh")} className={inputCls} /></Field>
            <AmountFields />
            <Field label={t("common.paidBy")}>
              <select name="paid_by" required className={inputCls}>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <RecurrenceFields includeVariable />
            <Field label={t("common.notes")} className="sm:col-span-2 lg:col-span-3"><input name="notes" className={inputCls} /></Field>
            <div><button className={btnCls}>{t("exp.addBtn")}</button></div>
          </form>
        )}
      </Card>

      <Card>
        {expenses.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("exp.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr><th className="pb-2">{t("exp.expense")}</th><th>{t("common.paidBy")}</th><th>{t("rec.repeats")}</th><th>{t("exp.next")}</th><th className="text-right">{t("common.amount")}</th><th /></tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const next = nextCharge(e);
                  const actual = actuals.get(`${e.id}:${thisMonth}`);
                  return (
                    <tr key={e.id} className="border-t border-zinc-100 align-top">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{e.name}</div>
                        <div className="text-xs text-zinc-500">{[e.category, e.notes].filter(Boolean).join(" · ")}</div>
                        {e.is_variable && (
                          <form action={logActual} className="mt-1 flex items-center gap-1">
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="name" value={e.name} />
                            <input type="hidden" name="currency" value={e.currency} />
                            <input type="hidden" name="month" value={thisMonth} />
                            <input name="amount" type="number" step="0.01" min="0" required placeholder={actual != null ? t("exp.actualPhValue", { v: actual }) : t("exp.actualPh")} className="w-36 rounded border border-zinc-300 px-2 py-1 text-xs" />
                            <button className="text-xs underline">{t("exp.logActual")}</button>
                          </form>
                        )}
                      </td>
                      <td className="pr-3">{name.get(e.paid_by)}</td>
                      <td className="pr-3">{intervalLabel(e.interval_months, t)}{e.is_variable && ` · ${t("rec.variableTag")}`}</td>
                      <td className="pr-3">{next ? fmtDate(next, locale) : e.interval_months ? t("exp.ended") : fmtDate(e.start_date, locale)}</td>
                      <td className="text-right tabular-nums">
                        <div>{e.is_variable && "~"}{money(e.amount, e.currency, locale)}</div>
                        {e.currency !== cur && <div className="text-xs text-zinc-400">≈ {money(convert(e.amount, e.currency, cur, rates), cur, locale)}</div>}
                      </td>
                      <td className="pl-3 text-right">
                        <form action={deleteExpense}><input type="hidden" name="id" value={e.id} /><button className={linkBtnCls}>{t("common.delete")}</button></form>
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
