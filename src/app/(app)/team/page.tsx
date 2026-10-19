import { getCompanyCtx } from "@/lib/company";
import { getT } from "@/lib/i18n/server";
import { Card, Field, PageHeader, btnCls, inputCls, linkBtnCls } from "@/components/ui";
import { inviteMember, removeMember, revokeInvitation, updateRole } from "./actions";

const ROLES = ["owner", "admin", "read_only"] as const;

export default async function TeamPage() {
  const { supabase, company, isOwner, me } = await getCompanyCtx();
  const { t } = await getT();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("memberships").select("user_id,email,role").eq("company_id", company.id).order("created_at"),
    isOwner ? supabase.from("invitations").select("id,email,role").eq("company_id", company.id).order("created_at") : Promise.resolve({ data: [] }),
  ]);

  const roleSelect = (name: string, value: string) => (
    <select name={name} defaultValue={value} className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm">
      {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
    </select>
  );

  return (
    <>
      <PageHeader title={t("team.title")} subtitle={t("team.subtitle", { company: company.name })} />

      {isOwner && (
        <Card title={t("team.invite")} className="mb-6">
          <p className="mb-3 text-sm text-zinc-500">{t("team.inviteHelp")}</p>
          <form action={inviteMember} className="grid gap-3 sm:grid-cols-3">
            <Field label={t("common.email")}><input name="email" type="email" required className={inputCls} /></Field>
            <Field label={t("team.role")}>
              <select name="role" defaultValue="read_only" className={inputCls}>{ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}</select>
            </Field>
            <div className="self-end"><button className={btnCls}>{t("team.sendInvite")}</button></div>
          </form>
          <p className="mt-3 text-xs text-zinc-500">{t("role.help")}</p>
        </Card>
      )}

      <Card title={t("team.members")} className="mb-6">
        <ul className="divide-y divide-zinc-100 text-sm">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{m.email} {m.user_id === me.id && <span className="text-zinc-400">({t("team.you")})</span>}</span>
              {isOwner ? (
                <span className="flex items-center gap-2">
                  <form action={updateRole} className="flex items-center gap-2">
                    <input type="hidden" name="user_id" value={m.user_id} />
                    {roleSelect("role", m.role)}
                    <button className="text-xs underline">{t("team.save")}</button>
                  </form>
                  <form action={removeMember}><input type="hidden" name="user_id" value={m.user_id} /><button className={linkBtnCls}>{t("common.remove")}</button></form>
                </span>
              ) : (
                <span className="text-zinc-500">{t(`role.${m.role as (typeof ROLES)[number]}`)}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {isOwner && (invites ?? []).length > 0 && (
        <Card title={t("team.pending")}>
          <ul className="divide-y divide-zinc-100 text-sm">
            {(invites ?? []).map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2">
                <span>{i.email} <span className="text-zinc-500">· {t(`role.${i.role as (typeof ROLES)[number]}`)}</span></span>
                <form action={revokeInvitation}><input type="hidden" name="id" value={i.id} /><button className={linkBtnCls}>{t("team.revoke")}</button></form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
