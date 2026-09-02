-- O acesso será controlado pelo painel do Supabase.
-- Removemos o trigger porque ele também interfere no cadastro administrativo.

drop trigger if exists enforce_allowed_signup_email on auth.users;
drop function if exists public.enforce_allowed_signup_email();

-- Remove o trigger antigo de criação automática de profiles, se existir.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- A tabela pode permanecer sem acesso público para auditoria/configuração.
alter table if exists public.allowed_signup_emails enable row level security;
revoke all on table public.allowed_signup_emails from anon, authenticated;
