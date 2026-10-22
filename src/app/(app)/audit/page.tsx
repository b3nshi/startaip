import { redirect } from "next/navigation";
import { getCompanyCtx } from "@/lib/company";
import { getT } from "@/lib/i18n/server";
import { intlLocale, type Key } from "@/lib/i18n/dict";
import { Card, PageHeader } from "@/components/ui";

const LIMIT = 300;
const HIDDEN = new Set(["id", "company_id", "created_at", "created_by", "invited_by", "user_id"]);
type Row = Record<string, unknown>;

export default async function AuditPage() {
  const { supabase, company, canWrite } = await getCompanyCtx();
  if (!canWrite) redirect("/dashboard");
  const { t, locale } = await getT();

  const [{ data: log }, { data: partners }, { data: services }] = await Promise.all([
    supabase.from("audit_log").select("*").eq("company_id", company.id).order("id", { ascending: false }).limit(LIMIT),
    supabase.from("partners").select("id,name").eq("company_id", company.id),
    supabase.from("services").select("id,name").eq("company_id", company.id),
  ]);
  const names = new Map([...(partners ?? []), ...(services ?? [])].map((p) => [p.id, p.name]));
  const show = (k: string, v: unknown) => (typeof v === "string" && names.has(v) ? names.get(v)! : v === null || v === "" ? "—" : String(v));

  /** Short human label for the record, then the fields shown (all on create/delete, only diffs on update). */
  function describe(a: { action: string; old_data: Row | null; new_data: Row | null }) {
    const row = (a.new_data ?? a.old_data ?? {}) as Row;
    const label = String(row.name ?? row.description ?? row.concept ?? row.email ?? row.currency ?? row.month ?? "");
    const keys = Object.keys(row).filter((k) => !HIDDEN.has(k));
    if (a.action === "update" && a.old_data && a.new_data) {
      const changed = keys.filter((k) => JSON.stringify(a.old_data![k]) !== JSON.stringify(a.new_data![k]));
      return { label, text: changed.map((k) => `${k}: ${show(k, a.old_data![k])} → ${show(k, a.new_data![k])}`).join(" · ") };
    }
    return { label, text: keys.filter((k) => k !== "name" && row[k] != null).map((k) => `${k}: ${show(k, row[k])}`).join(" · ") };
  }

  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "medium" });

  return (
    <>
      <PageHeader title={t("audit.title")} subtitle={t("audit.subtitle", { company: company.name })} />
      <Card>
        {!log?.length ? (
          <p className="text-sm text-zinc-500">{t("audit.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr><th className="pb-2">{t("audit.when")}</th><th>{t("audit.who")}</th><th>{t("audit.what")}</th><th>{t("audit.details")}</th></tr>
              </thead>
              <tbody>
                {log.map((a) => {
                  const d = describe(a);
                  return (
                    <tr key={a.id} className="border-t border-zinc-100 align-top">
                      <td className="whitespace-nowrap py-2 pr-3 text-zinc-500">{fmt.format(new Date(a.created_at))}</td>
                      <td className="pr-3">{a.user_email ?? t("audit.system")}</td>
                      <td className="pr-3 whitespace-nowrap">
                        {t(`action.${a.action}` as Key)} {t(`entity.${a.table_name}` as Key).toLowerCase()}
                        {d.label && <div className="font-medium">{d.label}</div>}
                      </td>
                      <td className="break-words text-xs text-zinc-500">{d.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {log.length === LIMIT && <p className="mt-3 text-xs text-zinc-500">{t("audit.last", { n: LIMIT })}</p>}
          </div>
        )}
      </Card>
    </>
  );
}
