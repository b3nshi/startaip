import Link from "next/link";
import { notFound } from "next/navigation";
import { loadData } from "@/lib/data";
import { deleteService, updateService } from "../../actions";
import { Card, Field, PageHeader, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { intervalLabel, nextCharge, occurrences, todayISO } from "@/lib/recurrence";
import { fmtDate, money, safeHref } from "@/lib/format";
import { convert } from "@/lib/currency";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function ServicePage(props: PageProps<"/services/[id]">) {
  const { id } = await props.params;
  const { services, partners, expenses, income, actuals, ratesFor, canWrite } = await loadData();
  const service = services.find((s) => s.id === id);
  if (!service) notFound();

  const { t, locale } = await getT();
  const cur = await getDisplayCurrency();
  const today = todayISO();
  const linkedExpenses = expenses.filter((e) => e.service_id === id);
  const linkedIncome = income.filter((i) => i.service_id === id);
  const spent = linkedExpenses.reduce((a, e) => a + occurrences(e, today, actuals).reduce((x, o) => x + convert(o.amount, e.currency, cur, ratesFor(e, o.date)), 0), 0);
  const earned = linkedIncome.reduce((a, i) => a + occurrences(i, today).reduce((x, o) => x + convert(o.amount, i.currency, cur, ratesFor(i, o.date)), 0), 0);
  const href = safeHref(service.url);
  const creator = partners.find((p) => p.id === service.created_by_partner)?.name;

  const facts: [string, React.ReactNode][] = [
    [t("svc.url"), href ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{service.url}</a> : "—"],
    [t("svc.accountEmail"), service.account_email ?? "—"],
    [t("svc.createdBy"), creator ?? "—"],
    [t("svc.createdOn"), service.created_on ? fmtDate(service.created_on, locale) : "—"],
    [t("svc.spentToDate"), money(spent, cur, locale)],
    [t("svc.earnedToDate"), money(earned, cur, locale)],
  ];

  return (
    <>
      <Link href="/services" className="mb-3 inline-block text-sm text-zinc-500 underline">{t("svc.back")}</Link>
      <PageHeader title={service.name} subtitle={service.description ?? undefined} />

      <Card className="mb-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}><dt className="text-xs font-medium text-zinc-500">{label}</dt><dd className="mt-0.5 break-words">{value}</dd></div>
          ))}
        </dl>
        {canWrite && (
          <form action={deleteService} className="mt-4"><input type="hidden" name="id" value={service.id} /><button className={linkBtnCls}>{t("common.delete")}</button></form>
        )}
      </Card>

      {canWrite && (
        <Card title={t("common.edit")} className="mb-6">
          <form action={updateService} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input type="hidden" name="id" value={service.id} />
            <Field label={t("common.name")}><input name="name" required defaultValue={service.name} className={inputCls} /></Field>
            <Field label={t("svc.url")}><input name="url" defaultValue={service.url ?? ""} className={inputCls} /></Field>
            <Field label={t("svc.accountEmail")}><input name="account_email" type="email" defaultValue={service.account_email ?? ""} className={inputCls} /></Field>
            <Field label={t("svc.createdBy")}>
              <select name="created_by_partner" defaultValue={service.created_by_partner ?? ""} className={inputCls}>
                <option value="">{t("svc.unknown")}</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label={t("svc.createdOn")}><input name="created_on" type="date" defaultValue={service.created_on ?? undefined} className={inputCls} /></Field>
            <Field label={t("svc.description")} className="sm:col-span-2 lg:col-span-3"><textarea name="description" rows={2} defaultValue={service.description ?? ""} className={inputCls} /></Field>
            <div><button className={btnCls}>{t("common.save")}</button></div>
          </form>
        </Card>
      )}

      {linkedExpenses.length === 0 && linkedIncome.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("svc.noLinked")}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={t("svc.linkedExpenses")}>
            {linkedExpenses.length === 0 ? <p className="text-sm text-zinc-500">—</p> : (
              <ul className="divide-y divide-zinc-100 text-sm">
                {linkedExpenses.map((e) => {
                  const next = nextCharge(e);
                  return (
                    <li key={e.id} className="flex justify-between gap-3 py-2">
                      <span><b>{e.name}</b> <span className="text-zinc-500">{intervalLabel(e.interval_months, t)}{next && ` · ${fmtDate(next, locale)}`}</span></span>
                      <span className="tabular-nums">{e.is_variable && "~"}{money(e.amount, e.currency, locale)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card title={t("svc.linkedIncome")}>
            {linkedIncome.length === 0 ? <p className="text-sm text-zinc-500">—</p> : (
              <ul className="divide-y divide-zinc-100 text-sm">
                {linkedIncome.map((i) => {
                  const next = nextCharge(i);
                  return (
                    <li key={i.id} className="flex justify-between gap-3 py-2">
                      <span><b>{i.description}</b> <span className="text-zinc-500">{intervalLabel(i.interval_months, t)}{next && ` · ${fmtDate(next, locale)}`}</span></span>
                      <span className="tabular-nums">{money(i.amount, i.currency, locale)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
