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
  using (auth.uid() = user_id);

create policy "Users can insert their own studies"
  on public.study_records for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own studies"
  on public.study_records for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own studies"
  on public.study_records for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.study_records to authenticated;
