"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import type { Key } from "@/lib/i18n/dict";

const items: [string, Key][] = [
  ["/dashboard", "nav.dashboard"],
  ["/expenses", "nav.expenses"],
  ["/income", "nav.income"],
  ["/partners", "nav.partners"],
  ["/settings", "nav.settings"],
];

export function Nav() {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(([href, key]) => (
        <Link
          key={href}
          href={href}
          className={`rounded-lg px-3 py-2 text-sm ${path.startsWith(href) ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-200"}`}
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
