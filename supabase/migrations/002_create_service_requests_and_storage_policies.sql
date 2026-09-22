create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  service_type text not null,
  description text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_requester_idx
  on public.service_requests(requester_id);
create index if not exists service_requests_provider_idx
  on public.service_requests(provider_id);

create or replace function public.validate_service_request_provider()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.provider_id and role = 'provider'
  ) then
    raise exception 'Service request provider must have provider role';
  end if;
  return new;
end;
$$;

create trigger validate_service_request_provider
before insert or update on public.service_requests
for each row execute procedure public.validate_service_request_provider();

alter table public.service_requests enable row level security;

create policy "Requesters can create their own requests"
on public.service_requests for insert
with check (auth.uid() = requester_id);

create policy "Requesters can read their own requests"
on public.service_requests for select
using (auth.uid() = requester_id);

create policy "Providers can read assigned requests"
on public.service_requests for select
using (auth.uid() = provider_id);

create policy "Providers can update assigned request status"
on public.service_requests for update
using (auth.uid() = provider_id)
with check (auth.uid() = provider_id);

create or replace function public.protect_service_request_ownership()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
    and (new.requester_id <> old.requester_id or new.provider_id <> old.provider_id) then
    raise exception 'Request ownership cannot be changed';
  end if;
  return new;
end;
$$;

create trigger protect_service_request_ownership
before update on public.service_requests
for each row execute procedure public.protect_service_request_ownership();

create trigger set_service_requests_updated_at
before update on public.service_requests
for each row execute procedure public.update_updated_at_column();

-- The application default and .env.example bucket name is profile-pictures.
-- Change this bucket ID if SUPABASE_STORAGE_BUCKET is configured differently.
create policy "Users can upload files in their own folder"
on storage.objects for insert
with check (
  bucket_id = 'profile-pictures'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update files in their own folder"
on storage.objects for update
using (
  bucket_id = 'profile-pictures'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-pictures'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete files in their own folder"
on storage.objects for delete
using (
  bucket_id = 'profile-pictures'
  and auth.uid()::text = (storage.foldername(name))[1]
);