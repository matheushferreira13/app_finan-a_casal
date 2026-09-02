-- Permite cadastro somente para os dois usuários do casal.
-- Execute esta migration no SQL Editor do Supabase.

create table if not exists public.allowed_signup_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint allowed_signup_emails_lowercase check (email = lower(email))
);

insert into public.allowed_signup_emails (email)
values
  ('matheushferreira13@gmail.com'),
  ('luanajhennifer123@gmail.com')
on conflict (email) do nothing;

alter table public.allowed_signup_emails enable row level security;
revoke all on table public.allowed_signup_emails from anon, authenticated;

create or replace function public.enforce_allowed_signup_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null
     or not exists (
       select 1
       from public.allowed_signup_emails
       where email = lower(trim(new.email))
     ) then
    raise exception 'Este e-mail não está autorizado para este aplicativo.';
  end if;

  return new;
end;
$$;

-- Triggers precisam de EXECUTE para o role interno que insere em auth.users.
-- A função não possui argumentos e só é útil como trigger.
grant execute on function public.enforce_allowed_signup_email() to public;

drop trigger if exists enforce_allowed_signup_email on auth.users;
create trigger enforce_allowed_signup_email
before insert on auth.users
for each row
execute function public.enforce_allowed_signup_email();
