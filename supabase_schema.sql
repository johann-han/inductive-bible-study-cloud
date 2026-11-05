-- Inductive Bible Study cloud library
-- Run this entire script in your Supabase project's SQL Editor.

create table if not exists public.study_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  book text not null,
  chapter integer not null check (chapter > 0),
  sections jsonb not null default '{"observe":"","interpret":"","apply":""}'::jsonb,
  active_section text not null default 'observe' check (active_section in ('observe', 'interpret', 'apply')),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (user_id, book, chapter),
  check (jsonb_typeof(sections) = 'object')
);

alter table public.study_records enable row level security;

-- Make this script safe to run again while keeping the intended policies explicit.
drop policy if exists "Users can read their own studies" on public.study_records;
drop policy if exists "Users can insert their own studies" on public.study_records;
drop policy if exists "Users can update their own studies" on public.study_records;
drop policy if exists "Users can delete their own studies" on public.study_records;

create policy "Users can read their own studies"
  on public.study_records for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own studies"
  on public.study_records for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own studies"
  on public.study_records for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own studies"
  on public.study_records for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.study_records from public;
revoke all on table public.study_records from anon;
revoke all on table public.study_records from authenticated;
grant select, insert, update, delete on table public.study_records to authenticated;

-- Kerygma cloud sermon vault
-- Each user can read and modify only their own sermon records.
create table if not exists public.kerygma_sermons (
  user_id uuid not null references auth.users(id) on delete cascade,
  sermon_id text not null check (length(btrim(sermon_id)) > 0),
  sermon_data jsonb not null check (jsonb_typeof(sermon_data) = 'object'),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  primary key (user_id, sermon_id)
);

alter table public.kerygma_sermons enable row level security;

drop policy if exists "Users can read their own Kerygma sermons" on public.kerygma_sermons;
drop policy if exists "Users can insert their own Kerygma sermons" on public.kerygma_sermons;
drop policy if exists "Users can update their own Kerygma sermons" on public.kerygma_sermons;
drop policy if exists "Users can delete their own Kerygma sermons" on public.kerygma_sermons;

create policy "Users can read their own Kerygma sermons"
  on public.kerygma_sermons for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own Kerygma sermons"
  on public.kerygma_sermons for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own Kerygma sermons"
  on public.kerygma_sermons for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own Kerygma sermons"
  on public.kerygma_sermons for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.kerygma_sermons from public;
revoke all on table public.kerygma_sermons from anon;
revoke all on table public.kerygma_sermons from authenticated;
grant select, insert, update, delete on table public.kerygma_sermons to authenticated;

-- Invitation requests submitted from the public IBS sign-in page.
-- Public/anonymous and authenticated browser roles receive no table privileges.
-- The existing Node server accesses this table with its server-only service key.
create table if not exists public.ibs_access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) between 2 and 120),
  email text not null check (
    length(email) between 3 and 254
    and email = lower(btrim(email))
  ),
  church_or_ministry text null check (
    church_or_ministry is null or length(church_or_ministry) <= 160
  ),
  message text null check (message is null or length(message) <= 600),
  status text not null default 'pending'
    check (status in ('pending', 'invited', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  invited_at timestamptz null,
  invited_by uuid null references auth.users(id) on delete set null
);

create unique index if not exists ibs_access_requests_one_pending_per_email_idx
  on public.ibs_access_requests (lower(email))
  where status = 'pending';

create index if not exists ibs_access_requests_pending_created_at_idx
  on public.ibs_access_requests (created_at desc)
  where status = 'pending';

alter table public.ibs_access_requests enable row level security;

revoke all on table public.ibs_access_requests from public;
revoke all on table public.ibs_access_requests from anon;
revoke all on table public.ibs_access_requests from authenticated;
grant select, insert, update, delete on table public.ibs_access_requests to service_role;

comment on table public.ibs_access_requests is
  'Private invitation requests from prospective IBS users. Access is server-only through service_role; no browser roles have table privileges.';
