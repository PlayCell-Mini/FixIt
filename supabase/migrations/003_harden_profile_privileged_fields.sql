drop policy if exists "Service providers can be read by anyone" on public.profiles;

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if new.id <> old.id or new.email <> old.email or new.role <> old.role then
      raise exception 'Profile identity and role fields cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
before update on public.profiles
for each row execute procedure public.protect_profile_privileged_fields();