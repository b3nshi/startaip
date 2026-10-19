"use client";

import { useActionState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LangSwitcher } from "@/components/switchers";
import { sendCode, verifyCode, type LoginState } from "./actions";

const input = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";
const btn = "w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50";

export default function LoginPage() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    (prev: LoginState, form: FormData) => (prev.step === "email" ? sendCode(prev, form) : verifyCode(prev, form)),
    { step: "email" } as LoginState,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="absolute right-4 top-4"><LangSwitcher /></div>
      <form action={action} className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Startup Costs</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {state.step === "email" ? t("login.subEmail") : t("login.subCode", { email: state.email ?? "" })}
          </p>
        </div>
        {state.step === "email" ? (
          <input key="email" name="email" type="email" required autoFocus placeholder="you@company.com" defaultValue={state.email} className={input} />
        ) : (
          <input key="code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus placeholder={t("login.codePh")} className={`${input} tracking-widest`} />
        )}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className={btn}>{pending ? "…" : state.step === "email" ? t("login.send") : t("login.verify")}</button>
      </form>
    </main>
  );
}
