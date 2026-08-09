ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS salary_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salary_day integer,
  ADD COLUMN IF NOT EXISTS salary_last_posted date;