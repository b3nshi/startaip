import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { TERMS, TERMS_VERSION } from "@/lib/terms";

export default async function TermsPage() {
  const { t, locale } = await getT();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/signup" className="text-sm text-zinc-500 underline">← {t("auth.back")}</Link>
      <h1 className="mt-4 text-2xl font-semibold">{t("terms.title")}</h1>
      <p className="mb-6 text-xs text-zinc-500">{t("terms.version", { v: TERMS_VERSION })}</p>
      {TERMS[locale].map((s) => (
        <section key={s.h} className="mb-5">
          <h2 className="font-medium">{s.h}</h2>
          <p className="mt-1 text-sm text-zinc-600">{s.p}</p>
        </section>
      ))}
    </main>
  );
}
