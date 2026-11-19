create or replace function public.increment_promo_usage(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.promo_codes
     set usage_count = usage_count + 1, updated_at = now()
   where code = upper(trim(p_code))
     and is_active = true
     and (usage_limit is null or usage_count < usage_limit)
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at >= now());
  return found;
end;
$$;
revoke all on function public.increment_promo_usage(text) from public, anon, authenticated;
grant execute on function public.increment_promo_usage(text) to service_role;
