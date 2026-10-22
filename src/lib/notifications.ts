/** Kinds of email a person can turn off, per company. */
export const NOTIFY_CATEGORIES = ["expense", "income", "cash_in", "transfer", "partner", "service", "rates"] as const;
export type NotifyCategory = (typeof NOTIFY_CATEGORIES)[number];
