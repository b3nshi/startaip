import Link from "next/link";
import { loadData } from "@/lib/data";
import { addPartner, addTransfer, deletePartner, deleteTransfer } from "../actions";
import { AmountFields, Card, Field, PageHeader, RateSelect, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { todayISO } from "@/lib/recurrence";
import { fmtDate, money } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export default async function PartnersPage() {
  const { partners, transfers, rateSets, canWrite } = await loadData();
  const { t, locale } = await getT();
  const today = todayISO();

  const name = new Map(partners.map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader title={t("par.title")} subtitle={t("par.subtitle")} />

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
            <RateSelect rateSets={rateSets} />
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
                <span className="whitespace-nowrap">
                  <Link href={`/partners/transfers/${x.id}`} className="mr-3 text-xs text-zinc-500 underline">{t("common.details")}</Link>
                  {canWrite && <form action={deleteTransfer} className="inline"><input type="hidden" name="id" value={x.id} /><button className={linkBtnCls}>{t("common.delete")}</button></form>}
                </span>
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
              <span className="whitespace-nowrap">
                <Link href={`/partners/${p.id}`} className="mr-3 text-xs text-zinc-500 underline">{canWrite ? t("common.edit") : t("common.details")}</Link>
                {canWrite && <form action={deletePartner} className="inline"><input type="hidden" name="id" value={p.id} /><button className={linkBtnCls}>{t("common.remove")}</button></form>}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
