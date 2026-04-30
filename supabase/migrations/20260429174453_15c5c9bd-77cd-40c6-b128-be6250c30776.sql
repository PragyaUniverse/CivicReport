
DROP POLICY "Public read issue media" ON storage.objects;
CREATE POLICY "Authenticated read issue media" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'issue-media');

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
