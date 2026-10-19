export type PartnerRow = { id: string; name: string; email: string; equity_pct: number | null };
export type TransferRow = { from_partner: string; to_partner: string; amount: number };

export type PartnerBalance = {
  partner: PartnerRow;
  paid: number;        // expenses this partner paid
  credits: number;     // other partners owe them (counts as investment)
  debts: number;       // they owe other partners
  invested: number;    // paid + credits - debts
  share: number;       // their fair share of total spend
  net: number;         // invested - share; > 0 means the others owe them
};

/** `spent` = total expenses so far, per paying partner. */
export function computeBalances(partners: PartnerRow[], spentBy: Map<string, number>, transfers: TransferRow[]) {
  const total = [...spentBy.values()].reduce((a, b) => a + b, 0);
  const explicit = partners.reduce((a, p) => a + (p.equity_pct ?? 0), 0);
  const unset = partners.filter((p) => p.equity_pct == null).length;
  const pct = (p: PartnerRow) => p.equity_pct ?? (unset ? Math.max(0, 100 - explicit) / unset : 0);

  const balances: PartnerBalance[] = partners.map((p) => {
    const paid = spentBy.get(p.id) ?? 0;
    const credits = transfers.filter((t) => t.to_partner === p.id).reduce((a, t) => a + Number(t.amount), 0);
    const debts = transfers.filter((t) => t.from_partner === p.id).reduce((a, t) => a + Number(t.amount), 0);
    const invested = paid + credits - debts;
    const share = (total * pct(p)) / 100;
    return { partner: p, paid, credits, debts, invested, share, net: invested - share };
  });
  return { balances, total, pct };
}

/** Greedy "who pays whom" to bring everyone to zero. */
export function settlements(balances: PartnerBalance[]) {
  const debtors = balances.filter((b) => b.net < -0.005).map((b) => ({ p: b.partner, left: -b.net }));
  const creditors = balances.filter((b) => b.net > 0.005).map((b) => ({ p: b.partner, left: b.net }));
  const out: { from: PartnerRow; to: PartnerRow; amount: number }[] = [];
  for (const d of debtors) {
    for (const c of creditors) {
      if (d.left <= 0.005) break;
      const amt = Math.min(d.left, c.left);
      if (amt <= 0.005) continue;
      out.push({ from: d.p, to: c.p, amount: amt });
      d.left -= amt;
      c.left -= amt;
    }
  }
  return out;
}
