"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/dict";
import type { Currency } from "@/lib/currency";

export type MonthPoint = { label: string; oneTime: number; recurring: number; income: number };

export function MonthlyChart({ data, currency }: { data: MonthPoint[]; currency: Currency }) {
  const { t, locale } = useI18n();
  const fmt = (n: number) =>
    new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency, maximumFractionDigits: 0, notation: "compact" }).format(n);
  const fmtFull = (n: number) => new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency }).format(n);
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#e4e4e7" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickFormatter={fmt} tickLine={false} axisLine={false} fontSize={12} width={72} />
          <Tooltip formatter={(v) => fmtFull(Number(v))} cursor={{ fill: "#f4f4f5" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="recurring" name={t("dash.recExp")} stackId="exp" fill="#3b5bdb" />
          <Bar dataKey="oneTime" name={t("dash.oneExp")} stackId="exp" fill="#f59f00" radius={[4, 4, 0, 0]} />
          <Bar dataKey="income" name={t("dash.income")} fill="#0ca678" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
