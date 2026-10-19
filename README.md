# Startup Costs

Next.js + Supabase app to track startup expenses, income and partner investments.

## Setup

Database changes live in `supabase/migrations/` (timestamped SQL files, applied in order, each only once) and are applied with the Supabase CLI (installed as a dev dependency).

1. Create a Supabase project, then link it (asks for the project ref and DB password):
   ```bash
   npx supabase login
   npm run db:link
   ```
2. Apply all migrations:
   ```bash
   npm run db:push
   ```
3. Email templates + sign-in code length live in `supabase/config.toml` and `supabase/templates/` (the code email uses `{{ .Token }}` for both existing users and new sign-ups). `npm run db:config` pushes them together with your SMTP settings (read from `.env.local`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`). Supabase requires custom SMTP before it allows template changes, and its built-in mailer is heavily rate-limited anyway. Login codes are sent by Supabase through that SMTP; change notifications are sent by this app (below).
4. `cp .env.example .env.local` and fill in the keys (Supabase URL, anon key, service role key, `NEXT_PUBLIC_APP_URL`, optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` + `EMAIL_FROM`).
5. `npm run dev` → http://localhost:3000, then sign up. No manual seeding is needed.

### Changing the database

```bash
npm run db:new add_something      # creates supabase/migrations/<timestamp>_add_something.sql
# edit the file, then
npm run db:push                   # applies only the migrations not yet applied
```

Never edit a migration that has already been pushed; add a new one. `npm run db:diff` shows drift between your linked database and the migrations. To also run Supabase locally (needs Docker): `npx supabase start`, and `npx supabase db reset` re-applies every migration from scratch.

If your project still has the old hand-run `schema.sql`, reset it first (this deletes all data), then run `npm run db:push`:

```sql
drop schema public cascade; create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
```

## How it works

- **Accounts**: `/signup` (name, email, accept Terms and Conditions) → emailed code → in. `/login` for returning users. The accepted terms version and time are stored in `profiles`. The terms text in `src/lib/terms.ts` is a **template, have a lawyer review it** before going live.
- **Companies**: one account can create several companies (sidebar → "+ New company") and switch between them. Each company has its own expenses, income, partners, exchange rates, team and audit log.
- **Roles** (per company): **Owner** does everything including managing the team; **Admin** adds/edits/deletes data; **Read only** can only view. Owners invite people from the Team page: existing accounts get access immediately, new people get a pending invitation that is applied when they sign up with that email (and receive an email). A company always keeps at least one owner.
- **Audit log**: database triggers record every insert/update/delete on all company tables (including team, invitations and rates): who, when, old and new values. Nobody can edit or delete entries, not even through the app (the Audit page is visible to owners and admins).
- **Security**: all of this is enforced by Postgres row-level security, not just the UI, so a user can only touch companies they belong to and read-only users cannot write.
- **Expenses**: one-time, monthly, quarterly, yearly, every N months (domain every 2 years = 24). Variable ones (AI usage, GCP buckets) keep an estimate and let you "Log actual" per month.
- **Dashboard**: expenses (recurring vs one-time) and income per month, 5 months back to 3 ahead, plus run rate and upcoming charges.
- **Partners** (the people who put money in, separate from app users): paid so far, fair share (by equity %, equal if blank), balance, and a "who pays whom" suggestion. "X owes Y $N" entries count as Y's investment: P1 paid $100 → P2 owes $50; P1 owes P2 $30 for sessions → P2 owes P1 $20.
- **Emails**: every change emails all members of that company over SMTP.

## Languages & currencies

- **English / Español**: defaults to the browser language (`Accept-Language`); the switcher in the sidebar (and on the login page) saves your choice in a cookie. Strings live in `src/lib/i18n/dict.ts`; add a language by adding a column there.
- **USD, EUR, ARS**: every expense, income and owed amount keeps its own currency. Totals, the dashboard and partner balances are converted into the currency picked in the sidebar.
- **Exchange rates** are manual: Settings → "1 USD = X EUR / ARS", stored in `exchange_rates` (seeded with placeholder values, set real ones first). One current rate applies to all dates, with no history. To add a currency, extend `CURRENCIES` in `src/lib/currency.ts` and the currency checks via a new migration.

Income does not affect partner balances.
