-- Perfis editáveis e fotos dos membros do casal.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  name text not null default 'Usuário',
  role text not null default '',
  income numeric(12,2) not null default 0 check (income >= 0),
  avatar_url text,
  notifications jsonb not null default '{"goals": true, "high_spend": true, "weekly_summary": false}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_household_member(household_id));
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid() and (household_id is null or public.is_household_member(household_id)));
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_household_member(household_id))
  with check (id = auth.uid() or public.is_household_member(household_id));

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
