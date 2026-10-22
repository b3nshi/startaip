-- Exchange-rate history. A "rate set" is the rates (units per 1 USD) in force on some day. Every expense, income,
-- cash-in and partner transfer points at one, so records created together share it: edit the set and all of them
-- follow; point a record at another set to correct it. Replaces the single per-company `exchange_rates` row set.
-- Applied with `npm run db:push`.

create table rate_sets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  effective_date date not null default current_date,
  rates jsonb not null check (jsonb_typeof(rates) = 'object'),   -- e.g. {"EUR": 0.92, "ARS": 1200}; USD is always 1
  note text,
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create index rate_sets_company_date on rate_sets (company_id, effective_date desc, created_at desc);

-- One set per company, carried over from the current rates.
insert into rate_sets (company_id, effective_date, rates, note)
select c.id,
       coalesce(max(r.updated_at)::date, current_date),
       coalesce(jsonb_object_agg(r.currency, r.per_usd) filter (where r.currency <> 'USD'), '{"EUR": 0.92, "ARS": 1000}'::jsonb),
       'Initial rates'
from companies c left join exchange_rates r on r.company_id = c.id
group by c.id;

-- Records reference a set. Deleting a set that is still in use is refused.
do $$
declare t text;
begin
  foreach t in array array['expenses','income','cash_ins','partner_transfers'] loop
    execute format('alter table %I add column rate_set_id uuid', t);
    execute format('update %I x set rate_set_id = (select s.id from rate_sets s where s.company_id = x.company_id order by s.created_at limit 1)', t);
    execute format('alter table %I alter column rate_set_id set not null', t);
    execute format('alter table %I add foreign key (company_id, rate_set_id) references rate_sets (company_id, id) on delete restrict', t);
    execute format('create index on %I (rate_set_id)', t);
  end loop;
end $$;

drop table exchange_rates;

create trigger audit after insert or update or delete on rate_sets for each row execute function audit_trigger();
alter table rate_sets enable row level security;
create policy "members read" on rate_sets for select to authenticated using (is_member(company_id));
create policy "writers insert" on rate_sets for insert to authenticated with check (can_write(company_id));
create policy "writers update" on rate_sets for update to authenticated using (can_write(company_id)) with check (can_write(company_id));
create policy "writers delete" on rate_sets for delete to authenticated using (can_write(company_id));

-- New companies start with a placeholder set.
create or replace function create_company(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'name required'; end if;
  insert into companies (name, created_by) values (trim(p_name), auth.uid()) returning id into cid;
  insert into memberships (company_id, user_id, email, role) values (cid, auth.uid(), lower(auth.jwt() ->> 'email'), 'owner');
  insert into rate_sets (company_id, rates, note) values (cid, '{"EUR": 0.92, "ARS": 1000}', 'Placeholder rates: update them');
  return cid;
end $$;
