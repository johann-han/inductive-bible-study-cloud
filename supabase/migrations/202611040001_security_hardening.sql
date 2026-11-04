-- Security hardening for invitation-only multi-user IBS beta.
-- Restrict client roles to the CRUD operations required by the application.
-- RLS policies continue to isolate every row by auth.uid().
-- This migration does not modify or delete user data.

alter table public.study_records enable row level security;
alter table public.kerygma_sermons enable row level security;

revoke all on table public.study_records from anon;
revoke all on table public.study_records from authenticated;
grant select, insert, update, delete on table public.study_records to authenticated;

revoke all on table public.kerygma_sermons from anon;
revoke all on table public.kerygma_sermons from authenticated;
grant select, insert, update, delete on table public.kerygma_sermons to authenticated;

drop policy if exists "Users can read their own studies" on public.study_records;
drop policy if exists "Users can insert their own studies" on public.study_records;
drop policy if exists "Users can update their own studies" on public.study_records;
drop policy if exists "Users can delete their own studies" on public.study_records;

create policy "Users can read their own studies"
  on public.study_records for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own studies"
  on public.study_records for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own studies"
  on public.study_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own studies"
  on public.study_records for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own Kerygma sermons" on public.kerygma_sermons;
drop policy if exists "Users can insert their own Kerygma sermons" on public.kerygma_sermons;
drop policy if exists "Users can update their own Kerygma sermons" on public.kerygma_sermons;
drop policy if exists "Users can delete their own Kerygma sermons" on public.kerygma_sermons;

create policy "Users can read their own Kerygma sermons"
  on public.kerygma_sermons for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own Kerygma sermons"
  on public.kerygma_sermons for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own Kerygma sermons"
  on public.kerygma_sermons for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own Kerygma sermons"
  on public.kerygma_sermons for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Explicitly document expected client access.
comment on table public.study_records is
  'Private IBS study records; authenticated users may access only rows matching auth.uid().';
comment on table public.kerygma_sermons is
  'Private Kerygma sermon records; authenticated users may access only rows matching auth.uid().';
