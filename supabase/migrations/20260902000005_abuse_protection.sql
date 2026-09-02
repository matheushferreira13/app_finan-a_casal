-- Proteção contra spam de escrita por usuário autenticado.
-- Limite padrão: 60 inserts por minuto por operação e usuário.
create table if not exists public.api_write_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, operation, window_started_at)
);

alter table public.transactions
  add column if not exists request_id uuid;

create unique index if not exists transactions_household_request_id_idx
  on public.transactions (household_id, request_id)
  where request_id is not null;

alter table public.api_write_limits enable row level security;
revoke all on table public.api_write_limits from anon, authenticated;

create or replace function public.enforce_write_rate_limit(
  operation_name text,
  max_requests integer default 60,
  window_seconds integer default 60
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  window_start timestamptz;
  current_count integer;
begin
  if actor is null then
    raise exception 'Autenticação necessária';
  end if;

  window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':' || operation_name, 0));

  insert into public.api_write_limits (user_id, operation, window_started_at, request_count)
  values (actor, operation_name, window_start, 1)
  on conflict (user_id, operation, window_started_at)
  do update set request_count = api_write_limits.request_count + 1
  returning request_count into current_count;

  if current_count > max_requests then
    raise exception using
      errcode = 'P0001',
      message = 'Limite de requisições excedido. Tente novamente em alguns segundos.';
  end if;
end;
$$;

revoke all on function public.enforce_write_rate_limit(text, integer, integer) from public;
grant execute on function public.enforce_write_rate_limit(text, integer, integer) to authenticated;

create or replace function public.guard_transaction_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by <> auth.uid() then
    raise exception 'Criador inválido';
  end if;
  perform public.enforce_write_rate_limit('transactions', 60, 60);
  return new;
end;
$$;

drop trigger if exists guard_transaction_insert on public.transactions;
create trigger guard_transaction_insert
before insert on public.transactions
for each row execute function public.guard_transaction_insert();

create or replace function public.guard_generic_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_write_rate_limit(TG_ARGV[0], 30, 60);
  return new;
end;
$$;

revoke all on function public.guard_generic_write() from public;

drop trigger if exists guard_goal_insert on public.goals;
create trigger guard_goal_insert
before insert on public.goals
for each row execute function public.guard_generic_write('goals');

drop trigger if exists guard_bill_insert on public.recurring_bills;
create trigger guard_bill_insert
before insert on public.recurring_bills
for each row execute function public.guard_generic_write('recurring_bills');

drop trigger if exists guard_category_insert on public.categories;
create trigger guard_category_insert
before insert on public.categories
for each row execute function public.guard_generic_write('categories');

drop trigger if exists guard_contribution_insert on public.goal_contributions;
create trigger guard_contribution_insert
before insert on public.goal_contributions
for each row execute function public.guard_generic_write('goal_contributions');

-- Limpeza de janelas antigas sem impactar o fluxo atual.
create or replace function public.cleanup_api_write_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.api_write_limits
  where window_started_at < now() - interval '2 hours';
$$;
revoke all on function public.cleanup_api_write_limits() from public;
