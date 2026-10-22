-- Services (every tool/account the company uses, paid or not) and cash-ins (money partners put into the company).
-- Applied with `npm run db:push`.

-- ───────────── Services ─────────────
create table services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  url text,
  account_email text,                  -- main account the service is registered with
  created_by_partner uuid,             -- who created the account
  created_on date,                     -- when the account was created
  description text,                    -- how we use it
  created_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, created_by_partner) references partners (company_id, id)
);

-- Expenses and income can optionally belong to a service. Deleting a service only clears the link.
alter table expenses add column service_id uuid;
alter table expenses add foreign key (company_id, service_id) references services (company_id, id) on delete set null (service_id);
alter table income add column service_id uuid;
alter table income add foreign key (company_id, service_id) references services (company_id, id) on delete set null (service_id);

-- ───────────── Cash-ins ─────────────
-- `contributed_by` put money into the company. `received_by` is the partner who got it (null = it went straight to the company).
-- Counts as an investment by contributed_by; if a partner received it, that partner's investment drops by the same amount.
create table cash_ins (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contributed_by uuid not null,
  received_by uuid,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency in ('USD','EUR','ARS')),
  date date not null default current_date,
  concept text not null,
  method text,                         -- how / where it was added (bank transfer, cash, card…)
  created_at timestamptz not null default now(),
  check (received_by is null or received_by <> contributed_by),
  foreign key (company_id, contributed_by) references partners (company_id, id),
  foreign key (company_id, received_by) references partners (company_id, id)
);

-- ───────────── Audit + RLS (same as the other business tables) ─────────────
do $$
declare t text;
begin
  foreach t in array array['services','cash_ins'] loop
    execute format('create trigger audit after insert or update or delete on %I for each row execute function audit_trigger()', t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy "members read" on %I for select to authenticated using (is_member(company_id))', t);
    execute format('create policy "writers insert" on %I for insert to authenticated with check (can_write(company_id))', t);
    execute format('create policy "writers update" on %I for update to authenticated using (can_write(company_id)) with check (can_write(company_id))', t);
    execute format('create policy "writers delete" on %I for delete to authenticated using (can_write(company_id))', t);
  end loop;
end $$;
