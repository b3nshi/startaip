import Link from "next/link";
import { loadData } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { MonthlyChart, type MonthPoint } from "@/components/monthly-chart";
import { addMonths, monthLabel, monthlyEquivalent, occurrences, todayISO } from "@/lib/recurrence";
import { fmtDate, money } from "@/lib/format";
import { convert } from "@/lib/currency";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function Dashboard() {
  const { expenses, income, actuals, partners, ratesFor, services, cashIns, memberCount } = await loadData();
  const { t, locale } = await getT();
  const cur = await getDisplayCurrency();
  const m = (n: number) => money(n, cur, locale);
  const conv = (n: number, from: typeof cur, r: Parameters<typeof ratesFor>[0], date?: string) => convert(n, from, cur, ratesFor(r, date));

  const today = todayISO();
  const current = today.slice(0, 7);
  const first = addMonths(current, -5);
  const last = addMonths(current, 3);

  const months: string[] = [];
  for (let mo = first; mo <= last; mo = addMonths(mo, 1)) months.push(mo);
  const points = new Map<string, MonthPoint>(months.map((mo) => [mo, { label: monthLabel(mo, locale), oneTime: 0, recurring: 0, income: 0 }]));

  const lastDay = `${last}-31`;
  for (const e of expenses) {
    for (const o of occurrences(e, lastDay, actuals)) {
      const p = points.get(o.month);
      if (p) p[e.interval_months ? "recurring" : "oneTime"] += conv(o.amount, e.currency, e, o.date);
    }
  }
  for (const i of income) {
    for (const o of occurrences(i, lastDay)) {
      const p = points.get(o.month);
      if (p) p.income += conv(o.amount, i.currency, i, o.date);
    }
  }

  const now = points.get(current)!;
  const burn = expenses.reduce((a, e) => a + conv(monthlyEquivalent(e, today), e.currency, e, today), 0);
  const mrr = income.reduce((a, i) => a + conv(monthlyEquivalent(i, today), i.currency, i, today), 0);

  const horizon = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  const upcoming = expenses
    .flatMap((e) => occurrences(e, horizon, actuals).filter((o) => o.date >= today).map((o) => ({ ...o, e })))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
  const payer = new Map(partners.map((p) => [p.id, p.name]));

  const stats = [
    [t("dash.expMonth"), m(now.oneTime + now.recurring), t("dash.recOne", { r: m(now.recurring), o: m(now.oneTime) })],
    [t("dash.incMonth"), m(now.income), ""],
    [t("dash.netMonth"), m(now.income - now.oneTime - now.recurring), ""],
    [t("dash.runRate"), m(burn), t("dash.incRec", { n: m(mrr) })],
  ];

  const cashThisMonth = cashIns.filter((c) => c.date.startsWith(current)).reduce((a, c) => a + conv(c.amount, c.currency, c), 0);
  const cashTotal = cashIns.reduce((a, c) => a + conv(c.amount, c.currency, c), 0);
  const paidServices = new Set(expenses.map((e) => e.service_id).filter(Boolean)).size;
  const company = [
    [t("dash.services"), String(services.length), t("dash.servicesSub", { n: paidServices, m: Math.max(0, services.length - paidServices) }), "/services"],
    [t("dash.partners"), String(partners.length), "", "/partners"],
    [t("dash.team"), String(memberCount), "", "/team"],
    [t("dash.cashIn"), m(cashThisMonth), t("dash.cashInSub", { total: m(cashTotal) }), "/cash-in"],
  ];

  return (
    <>
      <PageHeader title={t("dash.title")} subtitle={t("dash.subtitle", { cur })} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, sub]) => (
          <Card key={label}>
            <div className="text-xs font-medium text-zinc-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
            {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
          </Card>
        ))}
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {company.map(([label, value, sub, href]) => (
          <Link key={label} href={href} className="block rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zinc-400">
            <div className="text-xs font-medium text-zinc-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
            {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
          </Link>
        ))}
      </div>
      <Card title={t("dash.perMonth")} className="mb-6">
        <MonthlyChart data={[...points.values()]} currency={cur} />
      </Card>
      <Card title={t("dash.upcoming")}>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("dash.nothing")}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 text-sm">
            {upcoming.map((u, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span>{fmtDate(u.date, locale)} · <b>{u.e.name}</b> <span className="text-zinc-500">{t("dash.paidBy", { name: payer.get(u.e.paid_by) ?? "?" })}</span></span>
                <span className="tabular-nums">{u.estimated && "~"}{money(u.amount, u.e.currency, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
