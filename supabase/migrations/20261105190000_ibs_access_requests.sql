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
