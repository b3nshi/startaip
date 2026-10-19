import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export type Role = "owner" | "admin" | "read_only";
export type CompanyRef = { id: string; name: string };

/** Signed-in user + their active company (cookie choice, else first). Redirects to company creation if none. */
export const getCompanyCtx = cache(async () => {
  const { supabase, user } = await requireUser();
  const [{ data: ms }, { data: profile }] = await Promise.all([
    supabase.from("memberships").select("role, company:companies(id, name)").eq("user_id", user.id),
    supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
  ]);
  const list = (ms ?? []).map((m) => ({ role: m.role as Role, company: m.company as unknown as CompanyRef }))
    .filter((m) => m.company)
    .sort((a, b) => a.company.name.localeCompare(b.company.name));
  if (!list.length) redirect("/companies/new");

  const saved = (await cookies()).get("company")?.value;
  const active = list.find((m) => m.company.id === saved) ?? list[0];
  const email = user.email!.toLowerCase();
  return {
    supabase,
    user,
    me: { id: user.id, email, name: profile?.full_name ?? email },
    companies: list.map((m) => m.company),
    company: active.company,
    role: active.role,
    canWrite: active.role !== "read_only",
    isOwner: active.role === "owner",
  };
});
