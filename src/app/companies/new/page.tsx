import Link from "next/link";
import { createCompany } from "@/app/company-actions";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { LangSwitcher } from "@/components/switchers";
import { Card, Field, btnCls, inputCls } from "@/components/ui";
import { signOut } from "@/app/login/actions";

export default async function NewCompanyPage() {
  const { supabase, user } = await requireUser();
  const { t } = await getT();
  const { count } = await supabase.from("memberships").select("*", { count: "exact", head: true }).eq("user_id", user.id);

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="mb-4 flex justify-end"><LangSwitcher /></div>
      <Card title={t("co.createTitle")}>
        <p className="mb-4 text-sm text-zinc-500">{t("co.createHelp")}</p>
        <form action={createCompany} className="space-y-3">
          <Field label={t("co.name")}><input name="name" required autoFocus placeholder={t("co.namePh")} className={inputCls} /></Field>
          <div className="flex items-center gap-3">
            <button className={btnCls}>{t("co.create")}</button>
            {count ? <Link href="/dashboard" className="text-sm text-zinc-500 underline">{t("co.cancel")}</Link> : null}
          </div>
        </form>
      </Card>
      {!count && <form action={signOut} className="mt-4 text-center"><button className="text-sm text-zinc-500 underline">{t("common.signOut")}</button></form>}
    </main>
  );
}
