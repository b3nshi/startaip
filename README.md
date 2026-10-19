# Startup Costs

Next.js + Supabase app to track startup expenses, income and partner investments.

## Setup

1. Create a Supabase project. Run `supabase/schema.sql` in the SQL editor, then insert yourself as the first partner (last lines of the file).
2. **Auth → Email Templates → Magic Link**: put `{{ .Token }}` in the body so the email carries the code, e.g. `Your code: {{ .Token }}`. The login codes are sent by Supabase, not by this app. Its built-in mailer is heavily rate-limited, so in **Auth → SMTP Settings** use Forward Email: host `smtp.forwardemail.net`, port 465, and the username/password from a generated alias password on your domain.
3. `cp .env.example .env.local` and fill in the keys (Supabase URL, anon key, service role key, optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` + `EMAIL_FROM`).
4. `npm run dev` → http://localhost:3000

## How it works

- **Login**: email → 6-digit code → session. Only emails in the `partners` table can request a code; RLS enforces the same on all data.
- **Expenses**: one-time, monthly, quarterly, yearly, every N months (domain every 2 years = 24). Variable ones (AI usage, GCP buckets) keep an estimate and let you "Log actual" per month.
- **Dashboard**: expenses (recurring vs one-time) and income per month, 5 months back to 3 ahead, plus run rate and upcoming charges.
- **Partners**: paid so far, fair share (by equity %, equal if blank), balance, and a "who pays whom" suggestion. "X owes Y $N" entries count as Y's investment: P1 paid $100 → P2 owes $50; P1 owes P2 $30 for sessions → P2 owes P1 $20.
- **Emails**: every add (expense, income, partner, owed amount, actual) emails all partners over SMTP (nodemailer; port 465 uses TLS, 587 uses STARTTLS).

## Languages & currencies

- **English / Español**: defaults to the browser language (`Accept-Language`); the switcher in the sidebar (and on the login page) saves your choice in a cookie. Strings live in `src/lib/i18n/dict.ts`; add a language by adding a column there.
- **USD, EUR, ARS**: every expense, income and owed amount keeps its own currency. Totals, the dashboard and partner balances are converted into the currency picked in the sidebar.
- **Exchange rates** are manual: Settings → "1 USD = X EUR / ARS", stored in `exchange_rates` (seeded with placeholder values, set real ones first). One current rate applies to all dates, with no history. To add a currency, extend `CURRENCIES` in `src/lib/currency.ts` and the checks in `schema.sql`.

Income does not affect partner balances.
