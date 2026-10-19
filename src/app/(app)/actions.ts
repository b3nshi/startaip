"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data";
import { notifyPartners } from "@/lib/email";
import { intervalLabel } from "@/lib/recurrence";
import { money, fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { CURRENCIES, isCurrency, type Currency } from "@/lib/currency";
import type { T } from "@/lib/i18n/dict";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optional = (f: FormData, k: string) => str(f, k) || null;

function amountOf(f: FormData, t: T, k = "amount") {
  const n = Number(str(f, k));
  if (!Number.isFinite(n) || n < 0) throw new Error(t("err.amount"));
  return n;
}

function currencyOf(f: FormData): Currency {
  const c = str(f, "currency");
  return isCurrency(c) ? c : "USD";
}

function intervalOf(f: FormData, t: T): number | null {
  const v = str(f, "interval");
  const n = v === "custom" ? Number(str(f, "custom_interval")) : Number(v);
  if (!n) return null;
  if (!Number.isInteger(n) || n < 1) throw new Error(t("err.interval"));
  return n;
}

async function ctx() {
  const { supabase, user } = await requireUser();
  const { t, locale } = await getT();
  const { data } = await supabase.from("partners").select("name").eq("email", user.email!.toLowerCase()).single();
  return { supabase, t, locale, by: data?.name ?? user.email! };
}

export async function addExpense(form: FormData) {
  const { supabase, by, t, locale } = await ctx();
  const row = {
    name: str(form, "name"),
    category: optional(form, "category"),
    amount: amountOf(form, t),
    currency: currencyOf(form),
    paid_by: str(form, "paid_by"),
    interval_months: intervalOf(form, t),
    start_date: str(form, "start_date"),
    end_date: optional(form, "end_date"),
    is_variable: form.get("is_variable") === "on",
    notes: optional(form, "notes"),
  };
  const { error } = await supabase.from("expenses").insert(row);
  if (error) throw new Error(error.message);
  const { data: payer } = await supabase.from("partners").select("name").eq("id", row.paid_by).single();
  const amount = money(row.amount, row.currency, locale);
  await notifyPartners(t("mail.newExpense", { name: row.name, amount }), [
    t("mail.addedExpense", { by }),
    `${row.name}${row.category ? ` (${row.category})` : ""}: ${amount}${row.is_variable ? ` ${t("mail.estimate")}` : ""}`,
    t("mail.repeatsStarting", { label: intervalLabel(row.interval_months, t), date: fmtDate(row.start_date, locale) }),
    t("mail.paidBy", { name: payer?.name ?? "?" }),
  ]);
  revalidatePath("/", "layout");
}

export async function deleteExpense(form: FormData) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("expenses").delete().eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Record the real amount (in the expense's own currency) of a variable expense for one month. */
export async function logActual(form: FormData) {
  const { supabase, by, t, locale } = await ctx();
  const month = str(form, "month");
  const amount = amountOf(form, t);
  const { error } = await supabase.from("expense_actuals").upsert({ expense_id: str(form, "id"), month, amount });
  if (error) throw new Error(error.message);
  const shown = money(amount, currencyOf(form), locale);
  await notifyPartners(t("mail.actual", { name: str(form, "name"), amount: shown }), [t("mail.actualBody", { by, month, amount: shown })]);
  revalidatePath("/", "layout");
}

export async function addIncome(form: FormData) {
  const { supabase, by, t, locale } = await ctx();
  const row = {
    description: str(form, "description"),
    amount: amountOf(form, t),
    currency: currencyOf(form),
    interval_months: intervalOf(form, t),
    start_date: str(form, "start_date"),
    end_date: optional(form, "end_date"),
  };
  const { error } = await supabase.from("income").insert(row);
  if (error) throw new Error(error.message);
  await notifyPartners(t("mail.newIncome", { name: row.description, amount: money(row.amount, row.currency, locale) }), [
    t("mail.addedIncome", { by }),
    t("mail.repeatsStarting", { label: intervalLabel(row.interval_months, t), date: fmtDate(row.start_date, locale) }),
  ]);
  revalidatePath("/", "layout");
}

export async function deleteIncome(form: FormData) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("income").delete().eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function addPartner(form: FormData) {
  const { supabase, by, t } = await ctx();
  const pct = optional(form, "equity_pct");
  const row = { name: str(form, "name"), email: str(form, "email").toLowerCase(), equity_pct: pct == null ? null : Number(pct) };
  const { error } = await supabase.from("partners").insert(row);
  if (error) throw new Error(error.message);
  await notifyPartners(t("mail.newPartner", { name: row.name }), [t("mail.partnerAdded", { by, name: row.name, email: row.email })]);
  revalidatePath("/", "layout");
}

export async function deletePartner(form: FormData) {
  const { supabase, t } = await ctx();
  const { error } = await supabase.from("partners").delete().eq("id", str(form, "id"));
  if (error) throw new Error(t("err.cannotRemove"));
  revalidatePath("/", "layout");
}

export async function addTransfer(form: FormData) {
  const { supabase, by, t, locale } = await ctx();
  const row = {
    from_partner: str(form, "from_partner"),
    to_partner: str(form, "to_partner"),
    amount: amountOf(form, t),
    currency: currencyOf(form),
    date: str(form, "date"),
    note: optional(form, "note"),
  };
  if (row.from_partner === row.to_partner) throw new Error(t("err.pickTwo"));
  const { error } = await supabase.from("partner_transfers").insert(row);
  if (error) throw new Error(error.message);
  const { data: ps } = await supabase.from("partners").select("id,name").in("id", [row.from_partner, row.to_partner]);
  const name = (id: string) => ps?.find((p) => p.id === id)?.name ?? "?";
  await notifyPartners(
    t("mail.balance", { from: name(row.from_partner), to: name(row.to_partner), amount: money(row.amount, row.currency, locale) }),
    [row.note ? t("mail.recordedNote", { by, note: row.note }) : t("mail.recorded", { by }), t("mail.countsAs", { name: name(row.to_partner) })],
  );
  revalidatePath("/", "layout");
}

export async function deleteTransfer(form: FormData) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("partner_transfers").delete().eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function saveRates(form: FormData) {
  const { supabase, by, t } = await ctx();
  const rows = CURRENCIES.filter((c) => c !== "USD").map((currency) => ({
    currency, per_usd: Number(str(form, currency)), updated_at: new Date().toISOString(),
  }));
  if (rows.some((r) => !(r.per_usd > 0))) throw new Error(t("err.rate"));
  const { error } = await supabase.from("exchange_rates").upsert(rows);
  if (error) throw new Error(error.message);
  await notifyPartners(t("mail.rates"), [t("mail.ratesBody", { by, list: rows.map((r) => `${r.per_usd} ${r.currency}`).join(" · ") })]);
  revalidatePath("/", "layout");
}
