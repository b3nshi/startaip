import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PartnerRow } from "@/lib/balances";
import { CURRENCIES, DEFAULT_RATES, type Currency, type Rates } from "@/lib/currency";

export type Expense = {
  id: string; name: string; category: string | null; amount: number; currency: Currency; paid_by: string;
  interval_months: number | null; start_date: string; end_date: string | null; is_variable: boolean; notes: string | null;
};
export type Income = {
  id: string; description: string; amount: number; currency: Currency; interval_months: number | null; start_date: string; end_date: string | null;
};
export type Transfer = {
  id: string; from_partner: string; to_partner: string; amount: number; currency: Currency; date: string; note: string | null;
};

const num = <T extends { amount: unknown }>(r: T) => ({ ...r, amount: Number(r.amount) });

export async function loadData() {
  const supabase = await createClient();
  const [partners, expenses, actuals, income, transfers, rateRows] = await Promise.all([
    supabase.from("partners").select("*").order("created_at"),
    supabase.from("expenses").select("*").order("start_date", { ascending: false }),
    supabase.from("expense_actuals").select("*"),
    supabase.from("income").select("*").order("start_date", { ascending: false }),
    supabase.from("partner_transfers").select("*").order("date", { ascending: false }),
    supabase.from("exchange_rates").select("*"),
  ]);
  const failed = [partners, expenses, actuals, income, transfers, rateRows].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const rates = { ...DEFAULT_RATES } as Rates;
  for (const r of rateRows.data ?? []) if (CURRENCIES.includes(r.currency)) rates[r.currency as Currency] = Number(r.per_usd);
  const ratesUpdatedAt = (rateRows.data ?? []).map((r) => r.updated_at as string).sort().pop() ?? null;

  return {
    rates,
    ratesUpdatedAt,
    partners: (partners.data ?? []).map((p) => ({ ...p, equity_pct: p.equity_pct == null ? null : Number(p.equity_pct) })) as PartnerRow[],
    expenses: (expenses.data ?? []).map(num) as Expense[],
    actuals: new Map((actuals.data ?? []).map((a) => [`${a.expense_id}:${a.month}`, Number(a.amount)])),
    actualRows: (actuals.data ?? []).map(num) as { expense_id: string; month: string; amount: number }[],
    income: (income.data ?? []).map(num) as Income[],
    transfers: (transfers.data ?? []).map(num) as Transfer[],
  };
}

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}
