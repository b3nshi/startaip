export type PartnerRow = { id: string; name: string; email: string; equity_pct: number | null };
export type TransferRow = { from_partner: string; to_partner: string; amount: number };
export type CashInRow = { contributed_by: string; received_by: string | null; amount: number };

export type PartnerBalance = {
  partner: PartnerRow;
  paid: number;        // expenses this partner paid
  credits: number;     // other partners owe them (counts as investment)
  debts: number;       // they owe other partners
  cashIn: number;      // money they put into the company
  cashHeld: number;    // cash-ins other partners handed to them (reduces their investment)
  invested: number;    // paid + credits - debts + cashIn - cashHeld
  share: number;       // their fair share of everything invested
  net: number;         // invested - share; > 0 means the others owe them
};

/**
 * `spentBy` = total expenses so far, per paying partner.
 * The pot everyone shares is the sum of what all partners invested, so balances always add up to zero.
 */
export function computeBalances(partners: PartnerRow[], spentBy: Map<string, number>, transfers: TransferRow[], cashIns: CashInRow[] = []) {
  const explicit = partners.reduce((a, p) => a + (p.equity_pct ?? 0), 0);
  const unset = partners.filter((p) => p.equity_pct == null).length;
  const pct = (p: PartnerRow) => p.equity_pct ?? (unset ? Math.max(0, 100 - explicit) / unset : 0);

  const balances: PartnerBalance[] = partners.map((p) => {
    const paid = spentBy.get(p.id) ?? 0;
    const credits = transfers.filter((t) => t.to_partner === p.id).reduce((a, t) => a + Number(t.amount), 0);
    const debts = transfers.filter((t) => t.from_partner === p.id).reduce((a, t) => a + Number(t.amount), 0);
    const cashIn = cashIns.filter((c) => c.contributed_by === p.id).reduce((a, c) => a + Number(c.amount), 0);
    const cashHeld = cashIns.filter((c) => c.received_by === p.id).reduce((a, c) => a + Number(c.amount), 0);
    const invested = paid + credits - debts + cashIn - cashHeld;
    return { partner: p, paid, credits, debts, cashIn, cashHeld, invested, share: 0, net: 0 };
  });
  const total = balances.reduce((a, b) => a + b.invested, 0);
  for (const b of balances) {
    b.share = (total * pct(b.partner)) / 100;
    b.net = b.invested - b.share;
  }
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
