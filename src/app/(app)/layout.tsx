import Link from "next/link";
import { getCompanyCtx } from "@/lib/company";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { Nav } from "@/components/nav";
import { CompanySwitcher, CurrencySwitcher, LangSwitcher } from "@/components/switchers";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";
import { SubmitButton } from "@/components/submit-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { me, companies, company, role, canWrite } = await getCompanyCtx();
  const { t } = await getT();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-4 md:flex-row md:p-6">
      <aside className="md:w-52 md:shrink-0">
        <Link href="/dashboard" className="mb-3 flex items-center gap-2 text-lg font-semibold"><Logo size={28} />Startup Costs</Link>
        <div className="mb-4"><CompanySwitcher companies={companies} currentId={company.id} /></div>
        <Nav showAudit={canWrite} />
        <div className="mt-4 flex gap-2"><LangSwitcher /><CurrencySwitcher current={await getDisplayCurrency()} /></div>
        <div className="mt-4 text-xs text-zinc-500">
          <p>{me.name}</p>
          <p>{t(`role.${role}`)}</p>
          <form action={signOut}><SubmitButton className="mt-1 underline">{t("common.signOut")}</SubmitButton></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {!canWrite && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("common.readOnlyNotice")}</p>}
        {children}
      </main>
    </div>
  );
}
