import { loadData } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { computeBalances, settlements } from "@/lib/balances";
import { occurrences, todayISO } from "@/lib/recurrence";
import { money } from "@/lib/format";
import { convert } from "@/lib/currency";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function BalancePage() {
  const { partners, expenses, actuals, transfers, cashIns, ratesFor } = await loadData();
  const { t, locale } = await getT();
  const cur = await getDisplayCurrency();
  const m = (n: number) => money(n, cur, locale);
  const today = todayISO();

  // Everything is converted to the display currency before comparing partners.
  const spentBy = new Map<string, number>();
  for (const e of expenses) {
    const total = occurrences(e, today, actuals).reduce((a, o) => a + convert(o.amount, e.currency, cur, ratesFor(e, o.date)), 0);
    spentBy.set(e.paid_by, (spentBy.get(e.paid_by) ?? 0) + total);
  }
  const conv = <T extends { amount: number; currency: typeof cur; rate_set_id: string }>(r: T) => ({ ...r, amount: convert(r.amount, r.currency, cur, ratesFor(r)) });
  const { balances, total, pct } = computeBalances(partners, spentBy, transfers.map(conv), cashIns.map(conv));
  const plan = settlements(balances);
  const signed = (n: number) => `${n >= 0 ? "+" : ""}${m(n)}`;

  return (
    <>
      <PageHeader title={t("bal.title")} subtitle={t("bal.subtitle", { cur })} />

      <Card title={t("bal.invested", { total: m(total) })} className="mb-6">
        {balances.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("par.addFirst")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="pb-2">{t("par.partner")}</th><th className="text-right">{t("bal.paidExp")}</th><th className="text-right">{t("bal.cashIn")}</th>
                  <th className="text-right">{t("bal.cashHeld")}</th><th className="text-right">{t("bal.owed")}</th><th className="text-right">{t("par.invested")}</th>
                  <th className="text-right">{t("par.share")}</th><th className="text-right">{t("par.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.partner.id} className="border-t border-zinc-100">
                    <td className="py-2"><div className="font-medium">{b.partner.name}</div><div className="text-xs text-zinc-500">{t("par.equity", { pct: pct(b.partner).toFixed(0) })}</div></td>
                    <td className="text-right tabular-nums">{m(b.paid)}</td>
                    <td className="text-right tabular-nums">{m(b.cashIn)}</td>
                    <td className="text-right tabular-nums">{b.cashHeld ? `−${m(b.cashHeld)}` : m(0)}</td>
                    <td className="text-right tabular-nums">{signed(b.credits - b.debts)}</td>
                    <td className="text-right font-medium tabular-nums">{m(b.invested)}</td>
                    <td className="text-right tabular-nums">{m(b.share)}</td>
                    <td className={`text-right font-medium tabular-nums ${b.net >= 0 ? "text-emerald-700" : "text-red-600"}`}>{signed(b.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-zinc-500">{t("bal.help")}</p>
          </div>
        )}
      </Card>

      <Card title={t("par.toEvenOut")}>
        {plan.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("bal.even")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {plan.map((s, i) => <li key={i}>{t("par.owesLine", { from: s.from.name, to: s.to.name, amount: m(s.amount) })}</li>)}
          </ul>
        )}
      </Card>
    </>
  );
}
