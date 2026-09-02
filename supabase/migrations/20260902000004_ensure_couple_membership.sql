-- Vincula automaticamente o segundo usuário autorizado à casa existente.
create or replace function public.ensure_household_access()
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  existing_household public.households;
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if current_email not in ('matheushferreira13@gmail.com', 'luanajhennifer123@gmail.com') then
    raise exception 'Usuário não autorizado';
  end if;

  select h.* into existing_household
  from public.households h
  join public.household_members hm on hm.household_id = h.id
  where hm.user_id = current_user_id
  limit 1;

  if existing_household.id is null then
    select * into existing_household
    from public.households
    order by created_at
    limit 1;

    if existing_household.id is null then
      insert into public.households (name, created_by)
      values ('Nossa casa', current_user_id)
      returning * into existing_household;
    end if;

    insert into public.household_members (household_id, user_id, role)
    values (existing_household.id, current_user_id, 'member')
    on conflict do nothing;
  end if;

  -- Sincroniza os dois usuários autorizados que já existem no Auth.
  insert into public.household_members (household_id, user_id, role)
  select
    existing_household.id,
    u.id,
    case when u.id = existing_household.created_by then 'owner' else 'member' end
  from auth.users u
  where lower(u.email) in ('matheushferreira13@gmail.com', 'luanajhennifer123@gmail.com')
  on conflict (household_id, user_id) do nothing;

  insert into public.profiles (id, household_id, name)
  select
    u.id,
    existing_household.id,
    case
      when lower(u.email) = 'matheushferreira13@gmail.com' then 'Matheus'
      when lower(u.email) = 'luanajhennifer123@gmail.com' then 'Luana'
      else split_part(u.email, '@', 1)
    end
  from auth.users u
  where lower(u.email) in ('matheushferreira13@gmail.com', 'luanajhennifer123@gmail.com')
  on conflict (id) do update set household_id = excluded.household_id;

  insert into public.profiles (id, household_id, name)
  values (
    current_user_id,
    existing_household.id,
    case
      when current_email = 'matheushferreira13@gmail.com' then 'Matheus'
      when current_email = 'luanajhennifer123@gmail.com' then 'Luana'
      else split_part(current_email, '@', 1)
    end
  )
  on conflict (id) do update set household_id = excluded.household_id;

  return existing_household;
end;
$$;

revoke all on function public.ensure_household_access() from public;
grant execute on function public.ensure_household_access() to authenticated;
