"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

export async function createCompany(form: FormData) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_company", { p_name: String(form.get("name") ?? "") });
  if (error) throw new Error(error.message);
  (await cookies()).set("company", data as string, opts);
  redirect("/dashboard");
}

export async function setCompany(id: string) {
  const { supabase, user } = await requireUser();
  // RLS-backed check: only companies the user belongs to can be selected.
  const { data } = await supabase.from("memberships").select("company_id").eq("user_id", user.id).eq("company_id", id).maybeSingle();
  if (!data) return;
  (await cookies()).set("company", id, opts);
  revalidatePath("/", "layout");
}
