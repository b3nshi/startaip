"use server";

import { revalidatePath } from "next/cache";
import { getCompanyCtx, type Role } from "@/lib/company";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { getT } from "@/lib/i18n/server";

const ROLES: Role[] = ["owner", "admin", "read_only"];
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const roleOf = (f: FormData) => {
  const r = str(f, "role") as Role;
  if (!ROLES.includes(r)) throw new Error("Invalid role");
  return r;
};

async function ownerCtx() {
  const c = await getCompanyCtx();
  const { t } = await getT();
  if (!c.isOwner) throw new Error(t("team.onlyOwners"));
  return { ...c, t };
}

async function ownerCount(c: Awaited<ReturnType<typeof ownerCtx>>) {
  const { count } = await c.supabase.from("memberships").select("*", { count: "exact", head: true }).eq("company_id", c.company.id).eq("role", "owner");
  return count ?? 0;
}

export async function inviteMember(form: FormData) {
  const c = await ownerCtx();
  const email = str(form, "email").toLowerCase();
  const role = roleOf(form);
  if (!email) return;

  // Look up an existing account (service role only for this read); the write below runs as the owner, so it is audited and RLS-checked.
  const { data: profile } = await createAdminClient().from("profiles").select("user_id").eq("email", email).maybeSingle();
  if (profile) {
    const { error } = await c.supabase.from("memberships").insert({ company_id: c.company.id, user_id: profile.user_id, email, role });
    if (error) throw new Error(error.code === "23505" ? c.t("team.alreadyMember") : error.message);
  } else {
    const row = { company_id: c.company.id, email, role, invited_by: c.me.id };
    let { error } = await c.supabase.from("invitations").insert(row);
    if (error?.code === "23505") {
      // already invited: just update the role
      ({ error } = await c.supabase.from("invitations").update({ role }).eq("company_id", c.company.id).eq("email", email));
    }
    if (error) throw new Error(error.message);
  }

  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { locale } = await getT();
  const { makeT } = await import("@/lib/i18n/dict");
  const tt = makeT(locale);
  await sendMail([email], tt("mail.invite", { by: c.me.name, company: c.company.name }), [
    tt("mail.inviteBody", { role: tt(`role.${role}`), company: c.company.name }),
    tt("mail.inviteCta", { url: `${url}${profile ? "/login" : "/signup"}` }),
  ]);
  revalidatePath("/", "layout");
}

export async function updateRole(form: FormData) {
  const c = await ownerCtx();
  const userId = str(form, "user_id");
  const role = roleOf(form);
  const { data: current } = await c.supabase.from("memberships").select("role").eq("company_id", c.company.id).eq("user_id", userId).single();
  if (current?.role === "owner" && role !== "owner" && (await ownerCount(c)) <= 1) throw new Error(c.t("team.lastOwner"));
  const { error } = await c.supabase.from("memberships").update({ role }).eq("company_id", c.company.id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function removeMember(form: FormData) {
  const c = await ownerCtx();
  const userId = str(form, "user_id");
  const { data: current } = await c.supabase.from("memberships").select("role").eq("company_id", c.company.id).eq("user_id", userId).single();
  if (current?.role === "owner" && (await ownerCount(c)) <= 1) throw new Error(c.t("team.lastOwner"));
  const { error } = await c.supabase.from("memberships").delete().eq("company_id", c.company.id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function revokeInvitation(form: FormData) {
  const c = await ownerCtx();
  const { error } = await c.supabase.from("invitations").delete().eq("id", str(form, "id")).eq("company_id", c.company.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
