
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'citizen');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'citizen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Issue enums
CREATE TYPE public.issue_category AS ENUM ('pothole','garbage','water','electricity','streetlight','sewage','other');
CREATE TYPE public.issue_status AS ENUM ('reported','in_progress','resolved','rejected');

-- Issues
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category issue_category NOT NULL,
  status issue_status NOT NULL DEFAULT 'reported',
  location_text TEXT NOT NULL,
  image_url TEXT,
  resolved_image_url TEXT,
  audio_url TEXT,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Issues viewable by authenticated" ON public.issues
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own issues" ON public.issues
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporter or admin updates" ON public.issues
  FOR UPDATE TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Reporter or admin deletes" ON public.issues
  FOR DELETE TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX issues_status_idx ON public.issues(status);
CREATE INDEX issues_category_idx ON public.issues(category);
CREATE INDEX issues_created_idx ON public.issues(created_at DESC);

-- Upvotes
CREATE TABLE public.upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issue_id, user_id)
);
ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Upvotes viewable by authenticated" ON public.upvotes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users upvote as themselves" ON public.upvotes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own upvote" ON public.upvotes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Status updates
CREATE TABLE public.status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_status issue_status,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Status updates viewable by authenticated" ON public.status_updates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins post status updates" ON public.status_updates
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND auth.uid() = author_id);

-- Trigger: update upvote_count + priority
CREATE OR REPLACE FUNCTION public.recompute_issue_priority()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _issue_id UUID;
  _count INTEGER;
BEGIN
  _issue_id := COALESCE(NEW.issue_id, OLD.issue_id);
  SELECT COUNT(*) INTO _count FROM public.upvotes WHERE issue_id = _issue_id;
  UPDATE public.issues SET upvote_count = _count, priority = 1 + _count, updated_at = now() WHERE id = _issue_id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER upvotes_recount
AFTER INSERT OR DELETE ON public.upvotes
FOR EACH ROW EXECUTE FUNCTION public.recompute_issue_priority();

-- Trigger: award points on issue insert
CREATE OR REPLACE FUNCTION public.award_report_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET points = points + 10, updated_at = now() WHERE id = NEW.reporter_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER issues_award_points
AFTER INSERT ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.award_report_points();

-- Trigger: updated_at for issues
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER issues_set_updated_at BEFORE UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: handle new user (profile + role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'citizen');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('issue-media','issue-media', true);

CREATE POLICY "Public read issue media" ON storage.objects
  FOR SELECT USING (bucket_id = 'issue-media');
CREATE POLICY "Authenticated upload issue media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'issue-media');
CREATE POLICY "Owner update issue media" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'issue-media' AND owner = auth.uid());
CREATE POLICY "Owner delete issue media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'issue-media' AND owner = auth.uid());
