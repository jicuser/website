-- Profile bootstrap is only needed after sign-in; its auth.uid() filter remains unchanged.
revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated, service_role;
