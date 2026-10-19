import Link from "next/link";
import { requireUser } from "@/lib/data";
import { signOut } from "@/app/login/actions";
import { Nav } from "@/components/nav";
import { CurrencySwitcher, LangSwitcher } from "@/components/switchers";
import { getDisplayCurrency, getT } from "@/lib/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const { t } = await getT();
  const { data: me } = await supabase.from("partners").select("name").eq("email", user.email!.toLowerCase()).maybeSingle();

  if (!me) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-lg font-semibold">{t("common.noAccess")}</h1>
        <p className="mt-2 text-sm text-zinc-500">{t("common.noAccessBody", { email: user.email! })}</p>
        <form action={signOut} className="mt-4"><button className="text-sm underline">{t("common.signOut")}</button></form>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-4 md:flex-row md:p-6">
      <aside className="md:w-52 md:shrink-0">
        <Link href="/dashboard" className="mb-4 block text-lg font-semibold">Startup Costs</Link>
        <Nav />
        <div className="mt-4 flex gap-2"><LangSwitcher /><CurrencySwitcher current={await getDisplayCurrency()} /></div>
        <div className="mt-4 text-xs text-zinc-500">
          <p>{me.name}</p>
          <form action={signOut}><button className="mt-1 underline">{t("common.signOut")}</button></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
