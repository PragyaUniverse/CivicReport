
REVOKE EXECUTE ON FUNCTION public.recompute_issue_priority() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_report_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
-- has_role stays callable by authenticated users (used in policies via SQL planner is fine, but explicit grant is OK)
