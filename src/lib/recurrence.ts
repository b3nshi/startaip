import { intlLocale, type Locale, type T } from "@/lib/i18n/dict";

export type Schedule = {
  id: string;
  amount: number;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  interval_months: number | null; // null = one-time
  is_variable?: boolean;
};

export type Occurrence = { date: string; month: string; amount: number; estimated: boolean };

const pad = (n: number) => String(n).padStart(2, "0");

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Every charge date of a schedule up to `until`, with variable-expense actuals applied. */
export function occurrences(s: Schedule, until: string, actuals?: Map<string, number>): Occurrence[] {
  const [sy, sm, sd] = s.start_date.split("-").map(Number);
  const out: Occurrence[] = [];
  for (let k = 0; k < 1200; k++) {
    const total = sy * 12 + (sm - 1) + k * (s.interval_months ?? 0);
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    const day = Math.min(sd, new Date(y, m, 0).getDate());
    const date = `${y}-${pad(m)}-${pad(day)}`;
    if (date > until || (s.end_date && date > s.end_date)) break;
    const month = date.slice(0, 7);
    const actual = actuals?.get(`${s.id}:${month}`);
    out.push({ date, month, amount: actual ?? s.amount, estimated: !!s.is_variable && actual === undefined });
    if (!s.interval_months) break;
  }
  return out;
}

/** Normalised monthly cost of a recurring schedule that is active today. */
export function monthlyEquivalent(s: Schedule, today = todayISO()): number {
  if (!s.interval_months || s.start_date > today || (s.end_date && s.end_date < today)) return 0;
  return s.amount / s.interval_months;
}

export function intervalLabel(n: number | null, t: T): string {
  if (!n) return t("rec.oneTime");
  if (n === 1) return t("rec.monthly");
  if (n === 3) return t("rec.quarterly");
  if (n === 12) return t("rec.yearly");
  if (n % 12 === 0) return t("rec.everyYears", { n: n / 12 });
  return t("rec.everyMonths", { n });
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
}

export function monthLabel(month: string, locale: Locale): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(intlLocale(locale), { month: "short", year: "2-digit" });
}

/** First charge date on/after `today`, or null if none (one-time in the past, or ended). */
export function nextCharge(s: Schedule, today = todayISO()): string | null {
  const horizon = `${Number(today.slice(0, 4)) + 30}-12-31`;
  return occurrences(s, horizon).find((o) => o.date >= today)?.date ?? null;
}
