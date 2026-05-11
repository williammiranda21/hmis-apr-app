-- APR Insight initial schema
-- Run this in: Supabase Dashboard → SQL Editor → New query

-- ============================================================================
-- ORGANIZATIONS + PROFILES
-- ============================================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coc_number text,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  role text default 'member' check (role in ('admin', 'member', 'viewer')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- REPORT DATA
-- ============================================================================

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  project_name text not null,
  project_id text,
  hmis_project_type text,
  hmis_project_type_label text,
  coc_number text,
  geocode text,
  organization_name text,
  software_version text,
  report_start_date date,
  report_end_date date,
  total_active_clients int default 0,
  total_active_households int default 0,
  source_file_name text,
  uploaded_at timestamptz default now()
);

create index if not exists report_runs_org_idx on public.report_runs (organization_id, uploaded_at desc);

create table if not exists public.apr_cells (
  id bigserial primary key,
  report_run_id uuid references public.report_runs(id) on delete cascade not null,
  question_id text not null,
  row_idx int,
  row_label text,
  section_label text,
  is_section_header boolean default false,
  col_idx int,
  col_label text,
  value_numeric numeric,
  value_type text
);

create index if not exists apr_cells_report_question_idx on public.apr_cells (report_run_id, question_id);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid references public.report_runs(id) on delete cascade not null,
  executive_summary text,
  model text,
  generated_at timestamptz default now()
);

create index if not exists analyses_report_idx on public.analyses (report_run_id, generated_at desc);

create table if not exists public.dq_findings (
  id bigserial primary key,
  analysis_id uuid references public.analyses(id) on delete cascade not null,
  severity text check (severity in ('info', 'warning', 'critical')),
  question_id text,
  message text,
  suggested_action text
);

create table if not exists public.recommendations (
  id bigserial primary key,
  analysis_id uuid references public.analyses(id) on delete cascade not null,
  category text,
  finding text,
  evidence text,
  suggested_action text
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.report_runs enable row level security;
alter table public.apr_cells enable row level security;
alter table public.analyses enable row level security;
alter table public.dq_findings enable row level security;
alter table public.recommendations enable row level security;

-- Helper: organizations the current user belongs to
create or replace function public.user_organization_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

-- Profiles: see your own + others in your org
drop policy if exists "profiles_select_self_or_org" on public.profiles;
create policy "profiles_select_self_or_org" on public.profiles for select
  using (
    auth.uid() = id
    or organization_id = public.user_organization_id()
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Organizations: see your own org. Anyone authenticated can insert (org creation flow).
drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member" on public.organizations for select
  using (id = public.user_organization_id());

drop policy if exists "organizations_insert_authenticated" on public.organizations;
create policy "organizations_insert_authenticated" on public.organizations for insert
  with check (auth.uid() is not null);

drop policy if exists "organizations_update_member" on public.organizations;
create policy "organizations_update_member" on public.organizations for update
  using (id = public.user_organization_id())
  with check (id = public.user_organization_id());

-- Report runs: scoped to your org for select/insert/delete
drop policy if exists "report_runs_select_org" on public.report_runs;
create policy "report_runs_select_org" on public.report_runs for select
  using (organization_id = public.user_organization_id());

drop policy if exists "report_runs_insert_org" on public.report_runs;
create policy "report_runs_insert_org" on public.report_runs for insert
  with check (organization_id = public.user_organization_id());

drop policy if exists "report_runs_delete_org" on public.report_runs;
create policy "report_runs_delete_org" on public.report_runs for delete
  using (organization_id = public.user_organization_id());

-- Cells, analyses, findings, recs: scoped through report ownership
drop policy if exists "apr_cells_select" on public.apr_cells;
create policy "apr_cells_select" on public.apr_cells for select
  using (
    report_run_id in (
      select id from public.report_runs where organization_id = public.user_organization_id()
    )
  );

drop policy if exists "apr_cells_insert" on public.apr_cells;
create policy "apr_cells_insert" on public.apr_cells for insert
  with check (
    report_run_id in (
      select id from public.report_runs where organization_id = public.user_organization_id()
    )
  );

drop policy if exists "analyses_select" on public.analyses;
create policy "analyses_select" on public.analyses for select
  using (
    report_run_id in (
      select id from public.report_runs where organization_id = public.user_organization_id()
    )
  );

drop policy if exists "analyses_insert" on public.analyses;
create policy "analyses_insert" on public.analyses for insert
  with check (
    report_run_id in (
      select id from public.report_runs where organization_id = public.user_organization_id()
    )
  );

drop policy if exists "dq_findings_select" on public.dq_findings;
create policy "dq_findings_select" on public.dq_findings for select
  using (
    analysis_id in (
      select a.id from public.analyses a
      join public.report_runs r on r.id = a.report_run_id
      where r.organization_id = public.user_organization_id()
    )
  );

drop policy if exists "dq_findings_insert" on public.dq_findings;
create policy "dq_findings_insert" on public.dq_findings for insert
  with check (
    analysis_id in (
      select a.id from public.analyses a
      join public.report_runs r on r.id = a.report_run_id
      where r.organization_id = public.user_organization_id()
    )
  );

drop policy if exists "recommendations_select" on public.recommendations;
create policy "recommendations_select" on public.recommendations for select
  using (
    analysis_id in (
      select a.id from public.analyses a
      join public.report_runs r on r.id = a.report_run_id
      where r.organization_id = public.user_organization_id()
    )
  );

drop policy if exists "recommendations_insert" on public.recommendations;
create policy "recommendations_insert" on public.recommendations for insert
  with check (
    analysis_id in (
      select a.id from public.analyses a
      join public.report_runs r on r.id = a.report_run_id
      where r.organization_id = public.user_organization_id()
    )
  );
