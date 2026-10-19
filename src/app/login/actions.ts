"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";
import { TERMS_VERSION } from "@/lib/terms";

export type AuthState = {
  mode: "login" | "signup";
  step: "email" | "code";
  email?: string;
  name?: string;
  accepted?: boolean;
  error?: string;
};

export async function sendCode(prev: AuthState, form: FormData): Promise<AuthState> {
  const { t } = await getT();
  const mode = prev.mode;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const accepted = form.get("terms") === "on";
  const base = { mode, step: "email" as const, email, name };

  if (!email) return { ...base, error: t("login.enterEmail") };
  if (mode === "signup") {
    if (!name) return { ...base, error: t("auth.nameRequired") };
    if (!accepted) return { ...base, error: t("auth.mustAccept") };
  }

  const { data: profile } = await createAdminClient().from("profiles").select("user_id").eq("email", email).maybeSingle();
  if (mode === "login" && !profile) return { ...base, error: t("auth.notFound") };
  if (mode === "signup" && profile) return { ...base, error: t("auth.exists") };

  const { error } = await (await createClient()).auth.signInWithOtp({ email, options: { shouldCreateUser: mode === "signup" } });
  if (error) return { ...base, error: error.message };
  return { mode, step: "code", email, name, accepted };
}

export async function verifyCode(prev: AuthState, form: FormData): Promise<AuthState> {
  const { t } = await getT();
  const token = String(form.get("code") ?? "").replace(/\s/g, "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: prev.email!, token, type: "email" });
  if (error || !data.user) return { ...prev, error: t("login.invalid") };

  if (prev.mode === "signup") {
    // Record the account and the terms version/time accepted.
    const { error: pErr } = await createAdminClient().from("profiles").upsert({
      user_id: data.user.id,
      email: prev.email!,
      full_name: prev.name || prev.email!,
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    });
    if (pErr) return { ...prev, error: pErr.message };
  }
  await supabase.rpc("accept_invitations"); // turns pending invites for this email into memberships
  redirect("/dashboard");
}

export async function signOut() {
  await (await createClient()).auth.signOut();
  redirect("/login");
}
