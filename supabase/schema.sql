-- Run in the Supabase SQL editor.

create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,          -- stored lowercase; also grants login access
  equity_pct numeric(5,2),             -- null = equal split among all partners
  created_at timestamptz not null default now()
);

-- interval_months: null = one-time, 1 = monthly, 3 = quarterly, 12 = yearly, 24 = every 2 years...
create table expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  amount numeric(12,2) not null check (amount >= 0),   -- per charge (an estimate if is_variable)
  currency text not null default 'USD' check (currency in ('USD','EUR','ARS')),
  paid_by uuid not null references partners(id),
  interval_months int check (interval_months > 0),
  start_date date not null,            -- first charge
  end_date date,                       -- optional: last day the recurrence is active
  is_variable boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- Real amount for a month of a variable expense (overrides the estimate; in the expense's currency)
create table expense_actuals (
  expense_id uuid not null references expenses(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  amount numeric(12,2) not null check (amount >= 0),
  primary key (expense_id, month)
);

create table income (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','EUR','ARS')),
  interval_months int check (interval_months > 0),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);

-- "from_partner owes to_partner amount". Counts as investment by to_partner.
create table partner_transfers (
  id uuid primary key default gen_random_uuid(),
  from_partner uuid not null references partners(id),
  to_partner uuid not null references partners(id),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency in ('USD','EUR','ARS')),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  check (from_partner <> to_partner)
);

-- Manual exchange rates: how many units of `currency` equal 1 USD. Update them in the app (Settings).
create table exchange_rates (
  currency text primary key check (currency in ('USD','EUR','ARS')),
  per_usd numeric(18,6) not null check (per_usd > 0),
  updated_at timestamptz not null default now()
);
insert into exchange_rates (currency, per_usd) values ('USD', 1), ('EUR', 0.92), ('ARS', 1000);  -- placeholders, set real rates

-- Access control: only people listed in `partners` can read/write anything.
create function is_partner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from partners where email = lower(auth.jwt() ->> 'email'));
$$;

alter table partners enable row level security;
alter table expenses enable row level security;
alter table expense_actuals enable row level security;
alter table exchange_rates enable row level security;
alter table income enable row level security;
alter table partner_transfers enable row level security;

create policy "partners only" on partners for all to authenticated using (is_partner()) with check (is_partner());
create policy "partners only" on expenses for all to authenticated using (is_partner()) with check (is_partner());
create policy "partners only" on expense_actuals for all to authenticated using (is_partner()) with check (is_partner());
create policy "partners only" on exchange_rates for all to authenticated using (is_partner()) with check (is_partner());
create policy "partners only" on income for all to authenticated using (is_partner()) with check (is_partner());
create policy "partners only" on partner_transfers for all to authenticated using (is_partner()) with check (is_partner());

-- Bootstrap: add yourself first (SQL editor bypasses RLS), then everything else is done in the app.
-- insert into partners (name, email) values ('Your Name', 'you@example.com');
