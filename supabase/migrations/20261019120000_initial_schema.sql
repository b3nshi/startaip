-- Initial schema: companies, roles, business data, audit log, RLS. Applied with `npm run db:push`.
-- Multi-company: every business table carries company_id; access is by membership + role.

-- ───────────── Users, companies, roles ─────────────
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  terms_accepted_at timestamptz not null,
  terms_version text not null,
  created_at timestamptz not null default now()
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- owner: everything incl. team management · admin: edit data · read_only: view only
create table memberships (
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,                 -- denormalised, lowercase (used for notifications / display)
  role text not null check (role in ('owner','admin','read_only')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- Pending access for people who have no account yet; accepted automatically on sign-up/login.
create table invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','admin','read_only')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index invitations_company_email on invitations (company_id, lower(email));

-- ───────────── Business data (per company) ─────────────
create table partners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  email text,                          -- informational only; app access is via memberships
  equity_pct numeric(5,2),             -- null = equal split among all partners
  created_at timestamptz not null default now(),
  unique (company_id, id)
);

-- interval_months: null = one-time, 1 = monthly, 3 = quarterly, 12 = yearly, 24 = every 2 years...
create table expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  category text,
  amount numeric(12,2) not null check (amount >= 0),   -- per charge (an estimate if is_variable)
  currency text not null default 'USD' check (currency in ('USD','EUR','ARS')),
  paid_by uuid not null,
  interval_months int check (interval_months > 0),
  start_date date not null,
  end_date date,
  is_variable boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, paid_by) references partners (company_id, id)
);

-- Real amount for a month of a variable expense (overrides the estimate; in the expense's currency)
create table expense_actuals (
  company_id uuid not null references companies(id) on delete cascade,
  expense_id uuid not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  amount numeric(12,2) not null check (amount >= 0),
  primary key (expense_id, month),
  foreign key (company_id, expense_id) references expenses (company_id, id) on delete cascade
);

create table income (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
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
  company_id uuid not null references companies(id) on delete cascade,
  from_partner uuid not null,
  to_partner uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency in ('USD','EUR','ARS')),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  check (from_partner <> to_partner),
  foreign key (company_id, from_partner) references partners (company_id, id),
  foreign key (company_id, to_partner) references partners (company_id, id)
);

-- Manual exchange rates per company: units of `currency` per 1 USD.
create table exchange_rates (
  company_id uuid not null references companies(id) on delete cascade,
  currency text not null check (currency in ('USD','EUR','ARS')),
  per_usd numeric(18,6) not null check (per_usd > 0),
  updated_at timestamptz not null default now(),
  primary key (company_id, currency)
);

-- ───────────── Audit log ─────────────
create table audit_log (
  id bigint generated always as identity primary key,
  company_id uuid not null,            -- deliberately no FK: history outlives anything
  user_id uuid,
  user_email text,
  action text not null check (action in ('insert','update','delete')),
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_company_time on audit_log (company_id, created_at desc);

-- ───────────── Access helpers ─────────────
create function member_role(cid uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from memberships where company_id = cid and user_id = auth.uid();
$$;
create function is_member(cid uuid) returns boolean language sql stable as $$ select member_role(cid) is not null; $$;
create function can_write(cid uuid) returns boolean language sql stable as $$ select coalesce(member_role(cid) in ('owner','admin'), false); $$;
create function is_owner(cid uuid) returns boolean language sql stable as $$ select coalesce(member_role(cid) = 'owner', false); $$;

-- ───────────── Audit trigger: logs every insert/update/delete with who and when ─────────────
create function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec jsonb;
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then return null; end if;
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into audit_log (company_id, user_id, user_email, action, table_name, record_id, old_data, new_data)
  values (
    case when tg_table_name = 'companies' then (rec->>'id')::uuid else (rec->>'company_id')::uuid end,
    auth.uid(),
    lower(auth.jwt() ->> 'email'),
    lower(tg_op),
    tg_table_name,
    coalesce(rec->>'id', concat_ws(':', rec->>'expense_id', rec->>'month', rec->>'user_id', rec->>'currency')),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['companies','memberships','invitations','partners','expenses','expense_actuals','income','partner_transfers','exchange_rates'] loop
    execute format('create trigger audit after insert or update or delete on %I for each row execute function audit_trigger()', t);
  end loop;
end $$;

-- ───────────── Row level security ─────────────
alter table profiles enable row level security;
alter table companies enable row level security;
alter table memberships enable row level security;
alter table invitations enable row level security;
alter table audit_log enable row level security;

create policy "own profile" on profiles for select to authenticated using (user_id = auth.uid());
create policy "members see company" on companies for select to authenticated using (is_member(id));
create policy "members see team" on memberships for select to authenticated using (is_member(company_id));
create policy "owners add members" on memberships for insert to authenticated with check (is_owner(company_id));
create policy "owners edit members" on memberships for update to authenticated using (is_owner(company_id)) with check (is_owner(company_id));
create policy "owners remove members" on memberships for delete to authenticated using (is_owner(company_id));
create policy "owners manage invitations" on invitations for all to authenticated using (is_owner(company_id)) with check (is_owner(company_id));
create policy "writers read audit" on audit_log for select to authenticated using (can_write(company_id));

do $$
declare t text;
begin
  foreach t in array array['partners','expenses','expense_actuals','income','partner_transfers','exchange_rates'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "members read" on %I for select to authenticated using (is_member(company_id))', t);
    execute format('create policy "writers insert" on %I for insert to authenticated with check (can_write(company_id))', t);
    execute format('create policy "writers update" on %I for update to authenticated using (can_write(company_id)) with check (can_write(company_id))', t);
    execute format('create policy "writers delete" on %I for delete to authenticated using (can_write(company_id))', t);
  end loop;
end $$;

-- The audit log is append-only and written only by the trigger.
revoke insert, update, delete, truncate on audit_log from anon, authenticated;

-- ───────────── RPCs (security definer, called by the app) ─────────────
create function create_company(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'name required'; end if;
  insert into companies (name, created_by) values (trim(p_name), auth.uid()) returning id into cid;
  insert into memberships (company_id, user_id, email, role) values (cid, auth.uid(), lower(auth.jwt() ->> 'email'), 'owner');
  insert into exchange_rates (company_id, currency, per_usd) values (cid,'USD',1), (cid,'EUR',0.92), (cid,'ARS',1000);  -- placeholders
  return cid;
end $$;

create function accept_invitations() returns int
language plpgsql security definer set search_path = public as $$
declare n int; e text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null then return 0; end if;
  insert into memberships (company_id, user_id, email, role)
    select company_id, auth.uid(), e, role from invitations where lower(email) = e
    on conflict do nothing;
  get diagnostics n = row_count;
  delete from invitations where lower(email) = e;
  return n;
end $$;

revoke execute on function create_company(text), accept_invitations() from public, anon;
grant execute on function create_company(text), accept_invitations() to authenticated;
