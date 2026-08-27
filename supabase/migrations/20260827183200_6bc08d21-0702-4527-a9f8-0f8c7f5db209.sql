
-- 1) Auto-publish approved resource principal applications into the public directory
create or replace function public.sync_resource_principal_from_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  name text;
begin
  if new.status <> 'approved' then
    return new;
  end if;

  select full_name, school_name, city, country, avatar_url
    into p
  from public.profiles where id = new.user_id;

  name := coalesce(nullif(trim(p.full_name), ''), 'Resource Principal');

  insert into public.resource_principals (
    user_id, slug, display_name, headline, school_name, city, country,
    bio, expertise, speaking_topics, credentials, photo_url, linkedin_url, status
  ) values (
    new.user_id,
    regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g') || '-' || left(new.user_id::text, 6),
    name, new.headline, p.school_name, p.city, p.country,
    new.bio, coalesce(new.expertise, '{}'), coalesce(new.speaking_topics, '{}'),
    new.credentials, p.avatar_url, new.linkedin_url, 'active'
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    headline = coalesce(excluded.headline, public.resource_principals.headline),
    bio = coalesce(excluded.bio, public.resource_principals.bio),
    expertise = excluded.expertise,
    speaking_topics = excluded.speaking_topics,
    status = 'active';

  insert into public.user_roles (user_id, role)
  values (new.user_id, 'expert')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke execute on function public.sync_resource_principal_from_application() from anon, authenticated;

drop trigger if exists trg_sync_resource_principal on public.resource_principal_applications;
create trigger trg_sync_resource_principal
after insert or update of status on public.resource_principal_applications
for each row execute function public.sync_resource_principal_from_application();

-- 2) Backfill already-approved applications
update public.resource_principal_applications
set status = 'approved'
where status = 'approved';

-- 3) Prevent users from self-approving their verification status
create or replace function public.protect_profile_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status
     and not public.has_role(auth.uid(), 'admin') then
    new.verification_status := old.verification_status;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_verification_status() from anon, authenticated;

drop trigger if exists trg_protect_profile_verification on public.profiles;
create trigger trg_protect_profile_verification
before update on public.profiles
for each row execute function public.protect_profile_verification_status();
