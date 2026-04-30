
-- 1. Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements viewable by authenticated" ON public.announcements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins post announcements" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND auth.uid() = author_id);
CREATE POLICY "Admins update announcements" ON public.announcements
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete announcements" ON public.announcements
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 2. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. Feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issue_id, user_id)
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feedback viewable by authenticated" ON public.feedback
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reporter rates resolved issues" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_id AND i.reporter_id = auth.uid() AND i.status = 'resolved')
  );

-- 4. Issues SLA + escalation columns
ALTER TABLE public.issues
  ADD COLUMN sla_due_at TIMESTAMPTZ,
  ADD COLUMN escalated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN escalated_at TIMESTAMPTZ;

-- 5. Set SLA on issue creation
CREATE OR REPLACE FUNCTION public.set_issue_sla()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hours INTEGER;
BEGIN
  hours := CASE NEW.category::text
    WHEN 'electricity' THEN 12
    WHEN 'water' THEN 24
    WHEN 'sewage' THEN 24
    WHEN 'garbage' THEN 72
    WHEN 'streetlight' THEN 96
    WHEN 'pothole' THEN 168
    ELSE 120
  END;
  NEW.sla_due_at := NEW.created_at + (hours || ' hours')::interval;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_issue_sla() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER issues_set_sla BEFORE INSERT ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.set_issue_sla();

UPDATE public.issues SET sla_due_at = created_at + interval '120 hours' WHERE sla_due_at IS NULL;

-- 6. Notify reporter on issue status change
CREATE OR REPLACE FUNCTION public.notify_reporter_on_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (
      NEW.reporter_id,
      'status',
      'Your issue status changed',
      'Status updated to ' || replace(NEW.status::text, '_', ' '),
      '/issue/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_reporter_on_status() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER issues_notify_status AFTER UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.notify_reporter_on_status();

-- 7. Notify reporter when admin adds a status update note
CREATE OR REPLACE FUNCTION public.notify_reporter_on_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _reporter UUID;
BEGIN
  SELECT reporter_id INTO _reporter FROM public.issues WHERE id = NEW.issue_id;
  IF _reporter IS NOT NULL AND _reporter <> NEW.author_id THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (
      _reporter,
      'comment',
      'New update on your issue',
      LEFT(NEW.note, 180),
      '/issue/' || NEW.issue_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_reporter_on_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER status_updates_notify AFTER INSERT ON public.status_updates
FOR EACH ROW EXECUTE FUNCTION public.notify_reporter_on_update();

-- 8. Award points on feedback
CREATE OR REPLACE FUNCTION public.award_feedback_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET points = points + 5, updated_at = now() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.award_feedback_points() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER feedback_award_points AFTER INSERT ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.award_feedback_points();
