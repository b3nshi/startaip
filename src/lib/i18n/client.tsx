"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type Locale, type T } from "./dict";

const Ctx = createContext<{ locale: Locale; t: T }>({ locale: "en", t: makeT("en") });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
