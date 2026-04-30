ALTER TABLE public.announcements 
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS body_hi text;