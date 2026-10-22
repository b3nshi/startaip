import Link from "next/link";
import { notFound } from "next/navigation";
import { loadData } from "@/lib/data";
import { deletePartner, updatePartner } from "../../actions";
import { Card, Field, PageHeader, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function PartnerPage(props: PageProps<"/partners/[id]">) {
  const { id } = await props.params;
  const { partners, canWrite } = await loadData();
  const p = partners.find((x) => x.id === id);
  if (!p) notFound();
  const { t } = await getT();

  return (
    <>
      <Link href="/partners" className="mb-3 inline-block text-sm text-zinc-500 underline">{t("par.back")}</Link>
      <PageHeader title={p.name} subtitle={t("par.manageHelp")} />
      <Card title={canWrite ? t("common.edit") : undefined}>
        <form action={updatePartner} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={p.id} />
          <fieldset disabled={!canWrite} className="contents">
            <Field label={t("common.name")}><input name="name" required defaultValue={p.name} className={inputCls} /></Field>
            <Field label={t("common.email")}><input name="email" type="email" defaultValue={p.email ?? ""} className={inputCls} /></Field>
            <Field label={t("par.equityLbl")}><input name="equity_pct" type="number" step="0.01" min="0" max="100" defaultValue={p.equity_pct ?? undefined} className={inputCls} /></Field>
          </fieldset>
          {canWrite && <div><button className={btnCls}>{t("common.save")}</button></div>}
        </form>
        {canWrite && (
          <form action={deletePartner} className="mt-4"><input type="hidden" name="id" value={p.id} /><button className={linkBtnCls}>{t("common.remove")}</button></form>
        )}
      </Card>
    </>
  );
}
