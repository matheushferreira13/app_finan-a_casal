-- Quitação mensal de contas recorrentes.
-- Uma conta permanece ativa; cada pagamento vira uma transação de saída.
create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  recurring_bill_id uuid not null references public.recurring_bills(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  paid_by uuid not null references auth.users(id) on delete restrict,
  period_start date not null,
  paid_at timestamptz not null default now(),
  unique (recurring_bill_id, period_start)
);

-- Antes desta migration, is_active era usado incorretamente como "pago".
-- Contas recorrentes devem permanecer ativas após a quitação.
update public.recurring_bills set is_active = true where is_active = false;

alter table public.transactions add column if not exists recurring_bill_id uuid references public.recurring_bills(id) on delete set null;
alter table public.transactions add column if not exists bill_period_start date;

create unique index if not exists transactions_bill_period_unique_idx
  on public.transactions (recurring_bill_id, bill_period_start)
  where recurring_bill_id is not null and bill_period_start is not null;
create index if not exists bill_payments_household_period_idx
  on public.bill_payments (household_id, period_start desc);

alter table public.bill_payments enable row level security;
create policy bill_payments_select on public.bill_payments for select
  using (public.is_household_member(household_id));
create policy bill_payments_insert on public.bill_payments for insert
  with check (public.is_household_member(household_id) and paid_by = auth.uid());
create policy bill_payments_delete on public.bill_payments for delete
  using (public.is_household_member(household_id));

create or replace function public.toggle_bill_payment(
  p_bill_id uuid,
  p_period_start date default date_trunc('month', current_date)::date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bill public.recurring_bills;
  existing_payment public.bill_payments;
  new_transaction_id uuid;
  actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Usuário não autenticado'; end if;

  select * into bill from public.recurring_bills
  where id = p_bill_id and public.is_household_member(household_id);
  if bill.id is null then raise exception 'Conta não encontrada'; end if;

  select * into existing_payment from public.bill_payments
  where recurring_bill_id = p_bill_id and period_start = p_period_start
  for update;

  if existing_payment.id is not null then
    delete from public.bill_payments where id = existing_payment.id;
    return false;
  end if;

  insert into public.transactions (
    household_id, category_id, created_by, payer_user_id, kind,
    description, amount, occurred_at, recurring_bill_id, bill_period_start
  ) values (
    bill.household_id, bill.category_id, actor, coalesce(bill.payer_user_id, actor),
    'expense', bill.name, bill.amount,
    greatest(now(), p_period_start::timestamptz), p_bill_id, p_period_start
  ) returning id into new_transaction_id;

  insert into public.bill_payments (
    recurring_bill_id, household_id, transaction_id, paid_by, period_start
  ) values (p_bill_id, bill.household_id, new_transaction_id, actor, p_period_start);

  return true;
end;
$$;

revoke all on function public.toggle_bill_payment(uuid, date) from public;
grant execute on function public.toggle_bill_payment(uuid, date) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bill_payments'
  ) then
    alter publication supabase_realtime add table public.bill_payments;
  end if;
end $$;
