"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALES } from "@/lib/i18n/dict";
import { isCurrency } from "@/lib/currency";

const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

export async function setLang(lang: string) {
  if (!LOCALES.includes(lang as never)) return;
  (await cookies()).set("lang", lang, opts);
  revalidatePath("/", "layout");
}

export async function setCurrency(cur: string) {
  if (!isCurrency(cur)) return;
  (await cookies()).set("cur", cur, opts);
  revalidatePath("/", "layout");
}
