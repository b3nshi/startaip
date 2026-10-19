import { loadData } from "@/lib/data";
import { saveRates } from "../actions";
import { Card, Field, PageHeader, btnCls, inputCls } from "@/components/ui";
import { CURRENCIES } from "@/lib/currency";
import { getT } from "@/lib/i18n/server";

export default async function SettingsPage() {
  const { rates, ratesUpdatedAt, canWrite } = await loadData();
  const { t, locale } = await getT();
  return (
    <>
      <PageHeader title={t("set.title")} subtitle={t("set.subtitle")} />
      <Card title={t("set.rates")}>
        <p className="mb-3 text-sm text-zinc-500">{t("set.help")}</p>
        <form action={saveRates} className="grid gap-3 sm:grid-cols-3">
          {CURRENCIES.map((c) =>
            c === "USD" ? (
              <Field key={c} label={t("set.perUsd", { cur: c })}>
                <input value="1" disabled className={`${inputCls} bg-zinc-100`} readOnly />
                <span className="text-xs text-zinc-400">{t("set.usdFixed")}</span>
              </Field>
            ) : (
              <Field key={c} label={t("set.perUsd", { cur: c })}>
                <input name={c} type="number" step="any" min="0.000001" required defaultValue={rates[c]} disabled={!canWrite} className={inputCls} />
              </Field>
            ),
          )}
          <div className="sm:col-span-3 flex items-center gap-3">
            {canWrite && <button className={btnCls}>{t("set.save")}</button>}
            {ratesUpdatedAt && <span className="text-xs text-zinc-500">{t("set.updated", { date: new Date(ratesUpdatedAt).toLocaleDateString(locale === "es" ? "es-AR" : "en-US") })}</span>}
          </div>
        </form>
      </Card>
    </>
  );
}
