"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyCtx } from "@/lib/company";
import { sendMail } from "@/lib/email";
import { intervalLabel } from "@/lib/recurrence";
import { money, fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { CURRENCIES, isCurrency, ratesFromJson, ratesSummary, type Currency, type RateMode } from "@/lib/currency";
import type { T } from "@/lib/i18n/dict";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFY_CATEGORIES, type NotifyCategory } from "@/lib/notifications";

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

async function ctx(opts: { owner?: boolean } = {}) {
  const c = await getCompanyCtx();
  const { t, locale } = await getT();
  if (opts.owner ? !c.isOwner : !c.canWrite) throw new Error(opts.owner ? t("team.onlyOwners") : t("common.readOnlyNotice"));
  return { ...c, t, locale, by: c.me.name, cid: c.company.id };
}

/** Email the members of the company who have not muted this category (subject is prefixed with the company name). */
async function notifyPartners(c: { supabase: Awaited<ReturnType<typeof getCompanyCtx>>["supabase"]; cid: string; company: { name: string } }, category: NotifyCategory, subject: string, lines: string[]) {
  const { data } = await c.supabase.from("memberships").select("user_id,email").eq("company_id", c.cid);
  // Other people's preferences are not visible to the current user under RLS, hence the service client.
  const { data: muted, error } = await createAdminClient().from("notification_prefs").select("user_id").eq("company_id", c.cid).contains("muted", [category]);
  if (error) {
    console.error("notification prefs lookup failed, email skipped", error);
    return;
  }
  const off = new Set((muted ?? []).map((m) => m.user_id));
  await sendMail((data ?? []).filter((m) => !off.has(m.user_id)).map((m) => m.email), `[${c.company.name}] ${subject}`, lines);
}

/** Rate set picked in the form; if none was sent (or it is not this company's), the newest one. */
async function rateSetIdOf(c: { supabase: Awaited<ReturnType<typeof getCompanyCtx>>["supabase"]; cid: string; t: T }, form: FormData) {
  const picked = str(form, "rate_set_id");
  if (picked) {
    const { data } = await c.supabase.from("rate_sets").select("id").eq("company_id", c.cid).eq("id", picked).maybeSingle();
    if (data) return data.id as string;
  }
  const { data } = await c.supabase.from("rate_sets").select("id").eq("company_id", c.cid)
    .order("effective_date", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) throw new Error(c.t("err.noRates"));
  return data.id as string;
}

const rateModeOf = (f: FormData): RateMode => (str(f, "rate_mode") === "by_date" ? "by_date" : "fixed");

const expenseFields = (form: FormData, t: T) => ({
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
  service_id: optional(form, "service_id"),
  rate_mode: rateModeOf(form),
});

const incomeFields = (form: FormData, t: T) => ({
  description: str(form, "description"),
  amount: amountOf(form, t),
  currency: currencyOf(form),
  interval_months: intervalOf(form, t),
  start_date: str(form, "start_date"),
  end_date: optional(form, "end_date"),
  service_id: optional(form, "service_id"),
  rate_mode: rateModeOf(form),
});

function cashInFields(form: FormData, t: T) {
  const row = {
    contributed_by: str(form, "contributed_by"),
    received_by: optional(form, "received_by"),
    amount: amountOf(form, t),
    currency: currencyOf(form),
    date: str(form, "date"),
    concept: str(form, "concept"),
    method: optional(form, "method"),
  };
  if (!(row.amount > 0)) throw new Error(t("err.amount"));
  if (row.received_by === row.contributed_by) throw new Error(t("err.pickTwo"));
  return row;
}

function transferFields(form: FormData, t: T) {
  const row = {
    from_partner: str(form, "from_partner"),
    to_partner: str(form, "to_partner"),
    amount: amountOf(form, t),
    currency: currencyOf(form),
    date: str(form, "date"),
    note: optional(form, "note"),
  };
  if (row.from_partner === row.to_partner) throw new Error(t("err.pickTwo"));
  return row;
}

export async function addExpense(form: FormData) {
  const c = await ctx();
  const { supabase, by, t, locale, cid } = c;
  const row = { company_id: cid, ...expenseFields(form, t), rate_set_id: await rateSetIdOf(c, form) };
  const { error } = await supabase.from("expenses").insert(row);
  if (error) throw new Error(error.message);
  const { data: payer } = await supabase.from("partners").select("name").eq("id", row.paid_by).single();
  const amount = money(row.amount, row.currency, locale);
  await notifyPartners(c, "expense", t("mail.newExpense", { name: row.name, amount }), [
    t("mail.addedExpense", { by }),
    `${row.name}${row.category ? ` (${row.category})` : ""}: ${amount}${row.is_variable ? ` ${t("mail.estimate")}` : ""}`,
    t("mail.repeatsStarting", { label: intervalLabel(row.interval_months, t), date: fmtDate(row.start_date, locale) }),
    t("mail.paidBy", { name: payer?.name ?? "?" }),
  ]);
  revalidatePath("/", "layout");
}

export async function updateExpense(form: FormData) {
  const c = await ctx();
  const row = { ...expenseFields(form, c.t), rate_set_id: await rateSetIdOf(c, form) };
  const { error } = await c.supabase.from("expenses").update(row).eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/expenses");
}

export async function deleteExpense(form: FormData) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("expenses").delete().eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/expenses");
}

/** Record the real amount (in the expense's own currency) of a variable expense for one month. */
export async function logActual(form: FormData) {
  const c = await ctx();
  const { supabase, by, t, locale, cid } = c;
  const month = str(form, "month");
  const amount = amountOf(form, t);
  const { error } = await supabase.from("expense_actuals").upsert({ company_id: cid, expense_id: str(form, "id"), month, amount });
  if (error) throw new Error(error.message);
  const shown = money(amount, currencyOf(form), locale);
  await notifyPartners(c, "expense", t("mail.actual", { name: str(form, "name"), amount: shown }), [t("mail.actualBody", { by, month, amount: shown })]);
  revalidatePath("/", "layout");
}

export async function addIncome(form: FormData) {
  const c = await ctx();
  const { supabase, by, t, locale, cid } = c;
  const row = { company_id: cid, ...incomeFields(form, t), rate_set_id: await rateSetIdOf(c, form) };
  const { error } = await supabase.from("income").insert(row);
  if (error) throw new Error(error.message);
  await notifyPartners(c, "income", t("mail.newIncome", { name: row.description, amount: money(row.amount, row.currency, locale) }), [
    t("mail.addedIncome", { by }),
    t("mail.repeatsStarting", { label: intervalLabel(row.interval_months, t), date: fmtDate(row.start_date, locale) }),
  ]);
  revalidatePath("/", "layout");
}

export async function updateIncome(form: FormData) {
  const c = await ctx();
  const row = { ...incomeFields(form, c.t), rate_set_id: await rateSetIdOf(c, form) };
  const { error } = await c.supabase.from("income").update(row).eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/income");
}

export async function deleteIncome(form: FormData) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("income").delete().eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/income");
}

export async function addService(form: FormData) {
  const c = await ctx();
  const { supabase, by, t, cid } = c;
  const row = {
    company_id: cid,
    name: str(form, "name"),
    url: optional(form, "url"),
    account_email: optional(form, "account_email")?.toLowerCase() ?? null,
    created_by_partner: optional(form, "created_by_partner"),
    created_on: optional(form, "created_on"),
    description: optional(form, "description"),
  };
  const { error } = await supabase.from("services").insert(row);
  if (error) throw new Error(error.message);
  await notifyPartners(c, "service", t("mail.newService", { name: row.name }), [
    t("mail.addedService", { by }),
    ...(row.url ? [t("mail.serviceUrl", { url: row.url })] : []),
    ...(row.description ? [t("mail.serviceUse", { text: row.description })] : []),
  ]);
  revalidatePath("/", "layout");
}

export async function updateService(form: FormData) {
  const { supabase } = await ctx();
  const id = str(form, "id");
  const row = {
    name: str(form, "name"),
    url: optional(form, "url"),
    account_email: optional(form, "account_email")?.toLowerCase() ?? null,
    created_by_partner: optional(form, "created_by_partner"),
    created_on: optional(form, "created_on"),
    description: optional(form, "description"),
  };
  const { error } = await supabase.from("services").update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect(`/services/${id}`);
}

export async function deleteService(form: FormData) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("services").delete().eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/services");
}

export async function addCashIn(form: FormData) {
  const c = await ctx();
  const { supabase, by, t, locale, cid } = c;
  const row = { company_id: cid, ...cashInFields(form, t), rate_set_id: await rateSetIdOf(c, form) };
  const { error } = await supabase.from("cash_ins").insert(row);
  if (error) throw new Error(error.message);
  const ids = [row.contributed_by, ...(row.received_by ? [row.received_by] : [])];
  const { data: ps } = await supabase.from("partners").select("id,name").in("id", ids);
  const name = (id: string) => ps?.find((p) => p.id === id)?.name ?? "?";
  await notifyPartners(c, "cash_in", t("mail.newCashIn", { name: row.concept, amount: money(row.amount, row.currency, locale) }), [
    t("mail.addedCashIn", { by, from: name(row.contributed_by) }),
    row.received_by ? t("mail.cashInReceiver", { name: name(row.received_by) }) : t("mail.cashInCompany"),
    ...(row.method ? [t("mail.cashInVia", { method: row.method })] : []),
    t("mail.countsAs", { name: name(row.contributed_by) }),
  ]);
  revalidatePath("/", "layout");
}

export async function updateCashIn(form: FormData) {
  const c = await ctx();
  const row = { ...cashInFields(form, c.t), rate_set_id: await rateSetIdOf(c, form) };
  const { error } = await c.supabase.from("cash_ins").update(row).eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/cash-in");
}

export async function deleteCashIn(form: FormData) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("cash_ins").delete().eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/cash-in");
}

export async function addPartner(form: FormData) {
  const c = await ctx();
  const { supabase, by, t, cid } = c;
  const pct = optional(form, "equity_pct");
  const row = { company_id: cid, name: str(form, "name"), email: optional(form, "email")?.toLowerCase() ?? null, equity_pct: pct == null ? null : Number(pct) };
  const { error } = await supabase.from("partners").insert(row);
  if (error) throw new Error(error.message);
  await notifyPartners(c, "partner", t("mail.newPartner", { name: row.name }), [t("mail.partnerAdded", { by, name: row.name, email: row.email ?? "—" })]);
  revalidatePath("/", "layout");
}

export async function updatePartner(form: FormData) {
  const { supabase } = await ctx();
  const pct = optional(form, "equity_pct");
  const row = { name: str(form, "name"), email: optional(form, "email")?.toLowerCase() ?? null, equity_pct: pct == null ? null : Number(pct) };
  const { error } = await supabase.from("partners").update(row).eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/partners");
}

export async function deletePartner(form: FormData) {
  const { supabase, t } = await ctx();
  const { error } = await supabase.from("partners").delete().eq("id", str(form, "id"));
  if (error) throw new Error(t("err.cannotRemove"));
  revalidatePath("/", "layout");
}

export async function addTransfer(form: FormData) {
  const c = await ctx();
  const { supabase, by, t, locale, cid } = c;
  const row = { company_id: cid, ...transferFields(form, t), rate_set_id: await rateSetIdOf(c, form) };
  const { error } = await supabase.from("partner_transfers").insert(row);
  if (error) throw new Error(error.message);
  const { data: ps } = await supabase.from("partners").select("id,name").in("id", [row.from_partner, row.to_partner]);
  const name = (id: string) => ps?.find((p) => p.id === id)?.name ?? "?";
  await notifyPartners(c, "transfer",
    t("mail.balance", { from: name(row.from_partner), to: name(row.to_partner), amount: money(row.amount, row.currency, locale) }),
    [row.note ? t("mail.recordedNote", { by, note: row.note }) : t("mail.recorded", { by }), t("mail.countsAs", { name: name(row.to_partner) })],
  );
  revalidatePath("/", "layout");
}

export async function updateTransfer(form: FormData) {
  const c = await ctx();
  const row = { ...transferFields(form, c.t), rate_set_id: await rateSetIdOf(c, form) };
  const { error } = await c.supabase.from("partner_transfers").update(row).eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/partners");
}

export async function deleteTransfer(form: FormData) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("partner_transfers").delete().eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/partners");
}

function rateSetFields(form: FormData, t: T) {
  const rates: Record<string, number> = {};
  for (const cur of CURRENCIES) if (cur !== "USD") rates[cur] = Number(str(form, cur));
  if (Object.values(rates).some((n) => !(n > 0))) throw new Error(t("err.rate"));
  return { effective_date: str(form, "effective_date"), rates, note: optional(form, "note") };
}

/** A new set of rates. Records created afterwards default to it; older ones keep theirs. */
export async function addRateSet(form: FormData) {
  const c = await ctx();
  const { supabase, by, t, cid } = c;
  const row = rateSetFields(form, t);
  const { error } = await supabase.from("rate_sets").insert({ company_id: cid, ...row });
  if (error) throw new Error(error.message);
  await notifyPartners(c, "rates", t("mail.rates"), [t("mail.ratesBody", { by, list: ratesSummary(ratesFromJson(row.rates)) })]);
  revalidatePath("/", "layout");
}

/** Changes the rates of an existing set: every record pointing at it is re-converted. */
export async function updateRateSet(form: FormData) {
  const c = await ctx();
  const { supabase, by, t } = c;
  const row = rateSetFields(form, t);
  const { error } = await supabase.from("rate_sets").update(row).eq("id", str(form, "id"));
  if (error) throw new Error(error.message);
  await notifyPartners(c, "rates", t("mail.rates"), [t("mail.ratesBody", { by, list: ratesSummary(ratesFromJson(row.rates)) })]);
  revalidatePath("/", "layout");
}

export async function deleteRateSet(form: FormData) {
  const { supabase, t } = await ctx();
  const { error } = await supabase.from("rate_sets").delete().eq("id", str(form, "id"));
  if (error) throw new Error(t("err.rateInUse"));
  revalidatePath("/", "layout");
}

/** Each person chooses which emails they get from the active company. Available to every role, including read-only. */
export async function saveNotificationPrefs(form: FormData) {
  const { supabase, me, company } = await getCompanyCtx();
  const wanted = new Set(form.getAll("notify").map(String));
  const muted = NOTIFY_CATEGORIES.filter((k) => !wanted.has(k));
  const { error } = await supabase.from("notification_prefs").upsert({ company_id: company.id, user_id: me.id, muted, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
