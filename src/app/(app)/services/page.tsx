import Link from "next/link";
import { loadData } from "@/lib/data";
import { addService } from "../actions";
import { Card, Field, PageHeader, btnCls, inputCls } from "@/components/ui";
import { monthlyEquivalent, todayISO } from "@/lib/recurrence";
import { fmtDate, money, safeHref } from "@/lib/format";
import { convert } from "@/lib/currency";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function ServicesPage() {
  const { services, partners, expenses, income, rates, canWrite } = await loadData();
  const { t, locale } = await getT();
  const cur = await getDisplayCurrency();
  const today = todayISO();
  const partnerName = new Map(partners.map((p) => [p.id, p.name]));

  const cost = (id: string) => expenses.filter((e) => e.service_id === id).reduce((a, e) => a + convert(monthlyEquivalent(e, today), e.currency, cur, rates), 0);
  const earns = (id: string) => income.filter((i) => i.service_id === id).reduce((a, i) => a + convert(monthlyEquivalent(i, today), i.currency, cur, rates), 0);

  return (
    <>
      <PageHeader title={t("svc.title")} subtitle={t("svc.subtitle")} />

      {canWrite && <Card title={t("svc.add")} className="mb-6">
        <form action={addService} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("common.name")}><input name="name" required placeholder={t("svc.namePh")} className={inputCls} /></Field>
          <Field label={t("svc.url")}><input name="url" placeholder="instagram.com/klivr" className={inputCls} /></Field>
          <Field label={t("svc.accountEmail")}><input name="account_email" type="email" className={inputCls} /></Field>
          <Field label={t("svc.createdBy")}>
            <select name="created_by_partner" defaultValue="" className={inputCls}>
              <option value="">{t("svc.unknown")}</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t("svc.createdOn")}><input name="created_on" type="date" className={inputCls} /></Field>
          <Field label={t("svc.description")} className="sm:col-span-2 lg:col-span-3"><textarea name="description" rows={2} placeholder={t("svc.descPh")} className={inputCls} /></Field>
          <div><button className={btnCls}>{t("svc.addBtn")}</button></div>
        </form>
      </Card>}

      <Card>
        {services.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("svc.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="pb-2">{t("svc.label")}</th><th>{t("svc.accountEmail")}</th><th>{t("svc.createdBy")}</th>
                  <th>{t("svc.createdOn")}</th><th className="text-right">{t("svc.monthlyCost")}</th><th className="text-right">{t("svc.monthlyIncome")}</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const href = safeHref(s.url);
                  const c = cost(s.id);
                  const inc = earns(s.id);
                  return (
                    <tr key={s.id} className="border-t border-zinc-100 align-top">
                      <td className="py-2 pr-3">
                        <Link href={`/services/${s.id}`} className="font-medium underline">{s.name}</Link>
                        {href && <div className="text-xs"><a href={href} target="_blank" rel="noopener noreferrer" className="text-zinc-500 underline">{s.url}</a></div>}
                        {s.description && <div className="mt-0.5 max-w-sm text-xs text-zinc-500">{s.description}</div>}
                      </td>
                      <td className="pr-3">{s.account_email ?? "—"}</td>
                      <td className="pr-3">{s.created_by_partner ? partnerName.get(s.created_by_partner) ?? "?" : "—"}</td>
                      <td className="pr-3 whitespace-nowrap">{s.created_on ? fmtDate(s.created_on, locale) : "—"}</td>
                      <td className="text-right tabular-nums">{c > 0 ? money(c, cur, locale) : <span className="text-zinc-400">{t("svc.free")}</span>}</td>
                      <td className="text-right tabular-nums">{inc > 0 ? money(inc, cur, locale) : "—"}</td>
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
