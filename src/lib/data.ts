import { getCompanyCtx } from "@/lib/company";
import type { PartnerRow } from "@/lib/balances";
import { CURRENCIES, DEFAULT_RATES, type Currency, type Rates } from "@/lib/currency";

export type Expense = {
  id: string; name: string; category: string | null; amount: number; currency: Currency; paid_by: string;
  interval_months: number | null; start_date: string; end_date: string | null; is_variable: boolean; notes: string | null;
  service_id: string | null;
};
export type Income = {
  id: string; description: string; amount: number; currency: Currency; interval_months: number | null; start_date: string; end_date: string | null;
  service_id: string | null;
};
export type Service = {
  id: string; name: string; url: string | null; account_email: string | null; created_by_partner: string | null;
  created_on: string | null; description: string | null; created_at: string;
};
export type CashIn = {
  id: string; contributed_by: string; received_by: string | null; amount: number; currency: Currency; date: string;
  concept: string; method: string | null;
};
export type Transfer = {
  id: string; from_partner: string; to_partner: string; amount: number; currency: Currency; date: string; note: string | null;
};

const num = <T extends { amount: unknown }>(r: T) => ({ ...r, amount: Number(r.amount) });

export async function loadData() {
  const { supabase, company, canWrite, isOwner, role } = await getCompanyCtx();
  const cid = company.id;
  const [partners, expenses, actuals, income, transfers, rateRows, services, cashIns, members] = await Promise.all([
    supabase.from("partners").select("*").eq("company_id", cid).order("created_at"),
    supabase.from("expenses").select("*").eq("company_id", cid).order("start_date", { ascending: false }),
    supabase.from("expense_actuals").select("*").eq("company_id", cid),
    supabase.from("income").select("*").eq("company_id", cid).order("start_date", { ascending: false }),
    supabase.from("partner_transfers").select("*").eq("company_id", cid).order("date", { ascending: false }),
    supabase.from("exchange_rates").select("*").eq("company_id", cid),
    supabase.from("services").select("*").eq("company_id", cid).order("name"),
    supabase.from("cash_ins").select("*").eq("company_id", cid).order("date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("company_id", cid),
  ]);
  const failed = [partners, expenses, actuals, income, transfers, rateRows, services, cashIns, members].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const rates = { ...DEFAULT_RATES } as Rates;
  for (const r of rateRows.data ?? []) if (CURRENCIES.includes(r.currency)) rates[r.currency as Currency] = Number(r.per_usd);
  const ratesUpdatedAt = (rateRows.data ?? []).map((r) => r.updated_at as string).sort().pop() ?? null;

  return {
    company, canWrite, isOwner, role,
    rates,
    ratesUpdatedAt,
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
