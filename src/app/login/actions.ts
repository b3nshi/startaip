"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";

export type LoginState = { step: "email" | "code"; email?: string; error?: string };

export async function sendCode(_: LoginState, form: FormData): Promise<LoginState> {
  const { t } = await getT();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { step: "email", error: t("login.enterEmail") };

  // Only partners can log in; check first so we don't send codes to strangers.
  const { data: partner } = await createAdminClient().from("partners").select("id").eq("email", email).maybeSingle();
  if (!partner) return { step: "email", email, error: t("login.notPartner") };

  const { error } = await (await createClient()).auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) return { step: "email", email, error: error.message };
  return { step: "code", email };
}

export async function verifyCode(prev: LoginState, form: FormData): Promise<LoginState> {
  const { t } = await getT();
  const token = String(form.get("code") ?? "").replace(/\s/g, "");
  const { error } = await (await createClient()).auth.verifyOtp({ email: prev.email!, token, type: "email" });
  if (error) return { step: "code", email: prev.email, error: t("login.invalid") };
  redirect("/dashboard");
}

export async function signOut() {
  await (await createClient()).auth.signOut();
  redirect("/login");
}
