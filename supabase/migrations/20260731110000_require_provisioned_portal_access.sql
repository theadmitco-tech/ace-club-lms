-- Unknown OAuth users must not receive active portal access automatically.
-- Admin provisioning creates or finds the auth user, then explicitly activates its profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    invited_at
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'student',
    false,
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;
