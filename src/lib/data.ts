import { getCompanyCtx } from "@/lib/company";
import type { PartnerRow } from "@/lib/balances";
import { DEFAULT_RATES, ratesFromJson, type Currency, type RateMode, type RateSet, type Rates } from "@/lib/currency";

export type Expense = {
  id: string; name: string; category: string | null; amount: number; currency: Currency; paid_by: string;
  interval_months: number | null; start_date: string; end_date: string | null; is_variable: boolean; notes: string | null;
  service_id: string | null; rate_set_id: string; rate_mode: RateMode;
};
export type Income = {
  id: string; description: string; amount: number; currency: Currency; interval_months: number | null; start_date: string; end_date: string | null;
  service_id: string | null; rate_set_id: string; rate_mode: RateMode;
};
export type Service = {
  id: string; name: string; url: string | null; account_email: string | null; created_by_partner: string | null;
  created_on: string | null; description: string | null; created_at: string;
};
export type CashIn = {
  id: string; contributed_by: string; received_by: string | null; amount: number; currency: Currency; date: string;
  concept: string; method: string | null; rate_set_id: string;
};
export type Transfer = {
  id: string; from_partner: string; to_partner: string; amount: number; currency: Currency; date: string; note: string | null; rate_set_id: string;
};

const num = <T extends { amount: unknown }>(r: T) => ({ ...r, amount: Number(r.amount) });

export async function loadData() {
  const { supabase, company, canWrite, isOwner, role } = await getCompanyCtx();
  const cid = company.id;
  const [partners, expenses, actuals, income, transfers, rateSetRows, services, cashIns, members] = await Promise.all([
    supabase.from("partners").select("*").eq("company_id", cid).order("created_at"),
    supabase.from("expenses").select("*").eq("company_id", cid).order("start_date", { ascending: false }),
    supabase.from("expense_actuals").select("*").eq("company_id", cid),
    supabase.from("income").select("*").eq("company_id", cid).order("start_date", { ascending: false }),
    supabase.from("partner_transfers").select("*").eq("company_id", cid).order("date", { ascending: false }),
    supabase.from("rate_sets").select("*").eq("company_id", cid).order("effective_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("services").select("*").eq("company_id", cid).order("name"),
    supabase.from("cash_ins").select("*").eq("company_id", cid).order("date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("company_id", cid),
  ]);
  const failed = [partners, expenses, actuals, income, transfers, rateSetRows, services, cashIns, members].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  // Newest first: the first one is what new records default to.
  const rateSets: RateSet[] = (rateSetRows.data ?? []).map((r) => ({
    id: r.id, effective_date: r.effective_date, rates: ratesFromJson(r.rates), note: r.note, created_at: r.created_at,
  }));
  const rateSetById = new Map(rateSets.map((r) => [r.id, r]));
  /** Set in force on a day: the newest one effective on/before it (the oldest if the day predates them all). */
  const setAt = (date: string) => rateSets.find((s) => s.effective_date <= date) ?? rateSets[rateSets.length - 1];
  /** The set a record converts with. `by_date` records (recurring charges) follow the date given; the rest use their own set (falls back to the newest). */
  const rateSetFor = (r: { rate_set_id: string; rate_mode?: RateMode }, date?: string): RateSet | undefined =>
    r.rate_mode === "by_date" && date ? setAt(date) : rateSetById.get(r.rate_set_id) ?? rateSets[0];
  const ratesFor = (r: { rate_set_id: string; rate_mode?: RateMode }, date?: string): Rates => rateSetFor(r, date)?.rates ?? DEFAULT_RATES;

  // How many records point at each set (editing a set re-converts all of them).
  const rateUsage = new Map<string, number>();
  for (const r of [...(expenses.data ?? []), ...(income.data ?? []), ...(cashIns.data ?? []), ...(transfers.data ?? [])])
    rateUsage.set(r.rate_set_id, (rateUsage.get(r.rate_set_id) ?? 0) + 1);

  return {
    company, canWrite, isOwner, role,
    rateSets,
    rateSetFor,
    ratesFor,
    rateUsage,
    partners: (partners.data ?? []).map((p) => ({ ...p, equity_pct: p.equity_pct == null ? null : Number(p.equity_pct) })) as PartnerRow[],
    expenses: (expenses.data ?? []).map(num) as Expense[],
    actuals: new Map((actuals.data ?? []).map((a) => [`${a.expense_id}:${a.month}`, Number(a.amount)])),
    actualRows: (actuals.data ?? []).map(num) as { expense_id: string; month: string; amount: number }[],
    income: (income.data ?? []).map(num) as Income[],
    transfers: (transfers.data ?? []).map(num) as Transfer[],
    services: (services.data ?? []) as Service[],
    cashIns: (cashIns.data ?? []).map(num) as CashIn[],
    memberCount: members.count ?? 0,
  };
}
