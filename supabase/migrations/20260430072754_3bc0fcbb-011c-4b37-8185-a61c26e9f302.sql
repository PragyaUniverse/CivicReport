-- Prevent users from upvoting their own issues
CREATE OR REPLACE FUNCTION public.prevent_self_upvote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reporter UUID;
BEGIN
  SELECT reporter_id INTO _reporter FROM public.issues WHERE id = NEW.issue_id;
  IF _reporter = NEW.user_id THEN
    RAISE EXCEPTION 'You cannot upvote your own report';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS upvotes_block_self ON public.upvotes;
CREATE TRIGGER upvotes_block_self
BEFORE INSERT ON public.upvotes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_upvote();