-- 1) Recurring expenses/income can convert each charge with the rate in force on that charge's date
--    ('by_date') instead of one fixed rate set ('fixed', the default and the old behaviour).
alter table expenses add column rate_mode text not null default 'fixed' check (rate_mode in ('fixed','by_date'));
alter table income add column rate_mode text not null default 'fixed' check (rate_mode in ('fixed','by_date'));

-- 2) Per-person, per-company email preferences. `muted` lists the notification categories they do NOT want;
--    no row = everything on. Each person manages only their own row.
create table notification_prefs (
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  muted text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
alter table notification_prefs enable row level security;
create policy "own prefs read" on notification_prefs for select to authenticated using (user_id = auth.uid());
create policy "own prefs insert" on notification_prefs for insert to authenticated with check (user_id = auth.uid() and is_member(company_id));
create policy "own prefs update" on notification_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member(company_id));
