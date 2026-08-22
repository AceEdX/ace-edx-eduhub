
REVOKE ALL ON FUNCTION public.protect_revenue_share_pct() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_resource_principal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_resource_principal(uuid) TO authenticated;
