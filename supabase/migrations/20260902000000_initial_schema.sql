-- Backend inicial do app de finanças do casal
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency char(3) not null default 'BRL',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  created_at timestamptz not null default now(),
  unique (household_id, name, kind)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  payer_user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('income', 'expense', 'transfer')),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  payer_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  frequency text not null default 'monthly'
    check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly')),
  due_day smallint check (due_day between 1 and 31),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  target_date date,
  status text not null default 'active'
    check (status in ('active', 'completed', 'paused')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  contribution_date timestamptz not null default now(),
  note text
);

create index if not exists transactions_household_date_idx
  on public.transactions (household_id, occurred_at desc);
create index if not exists bills_household_active_idx
  on public.recurring_bills (household_id, is_active);
create index if not exists goals_household_status_idx
  on public.goals (household_id, status);
create index if not exists contributions_goal_date_idx
  on public.goal_contributions (goal_id, contribution_date desc);

create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

-- Cria o casal e já inclui o usuário autenticado como owner.
create or replace function public.create_household(household_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household public.households;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  insert into public.households (name, created_by)
  values (household_name, auth.uid())
  returning * into new_household;

  insert into public.household_members (household_id, user_id, role)
  values (new_household.id, auth.uid(), 'owner');

  return new_household;
end;
$$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy households_select on public.households for select
  using (public.is_household_member(id));
create policy households_update on public.households for update
  using (public.is_household_member(id)) with check (public.is_household_member(id));

create policy members_select on public.household_members for select
  using (public.is_household_member(household_id) or user_id = auth.uid());
create policy members_insert on public.household_members for insert
  with check (public.is_household_member(household_id));
create policy members_delete on public.household_members for delete
  using (public.is_household_member(household_id));

create policy categories_all on public.categories for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy transactions_all on public.transactions for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy bills_all on public.recurring_bills for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy goals_all on public.goals for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy contributions_all on public.goal_contributions for all
  using (exists (
    select 1 from public.goals g
    where g.id = goal_id and public.is_household_member(g.household_id)
  ))
  with check (exists (
    select 1 from public.goals g
    where g.id = goal_id and public.is_household_member(g.household_id)
  ));

-- Habilita atualizações em tempo real para as telas compartilhadas.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'goals'
  ) then
    alter publication supabase_realtime add table public.goals;
  end if;
end $$;
