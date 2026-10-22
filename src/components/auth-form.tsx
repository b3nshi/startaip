"use client";

import { Logo } from "@/components/logo";
import Link from "next/link";
import { useActionState } from "react";
import { sendCode, verifyCode, type AuthState } from "@/app/login/actions";
import { useI18n } from "@/lib/i18n/client";
import { LangSwitcher } from "@/components/switchers";

const input = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";
const btn = "w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    (prev: AuthState, form: FormData) => (prev.step === "email" ? sendCode(prev, form) : verifyCode(prev, form)),
    { mode, step: "email" } as AuthState,
  );
  const signup = mode === "signup";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="absolute right-4 top-4"><LangSwitcher /></div>
      <form action={action} className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <Logo size={40} className="mb-3" />
          <h1 className="text-xl font-semibold">{signup && state.step === "email" ? t("auth.signupTitle") : "Startup Costs"}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {state.step === "email" ? (signup ? "" : t("login.subEmail")) : t("login.subCode", { email: state.email ?? "" })}
          </p>
        </div>
        {state.step === "email" ? (
          <>
            {signup && <input key="name" name="name" required autoFocus placeholder={t("auth.name")} defaultValue={state.name} className={input} />}
            <input key="email" name="email" type="email" required autoFocus={!signup} placeholder="you@company.com" defaultValue={state.email} className={input} />
            {signup && (
              <label className="flex items-start gap-2 text-sm">
                <input name="terms" type="checkbox" required className="mt-1" />
                <span>{t("auth.acceptPre")} <Link href="/terms" target="_blank" className="underline">{t("auth.termsLink")}</Link></span>
              </label>
            )}
          </>
        ) : (
          <input key="code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus placeholder={t("login.codePh")} className={`${input} tracking-widest`} />
        )}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className={btn}>
          {pending ? "…" : state.step === "code" ? t("login.verify") : signup ? t("auth.create") : t("login.send")}
        </button>
        {state.step === "email" && (
          <p className="text-center text-sm text-zinc-500">
            <Link href={signup ? "/login" : "/signup"} className="underline">{signup ? t("auth.haveAccount") : t("auth.noAccount")}</Link>
          </p>
        )}
      </form>
    </main>
  );
}
