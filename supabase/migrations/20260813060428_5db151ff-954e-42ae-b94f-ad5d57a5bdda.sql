ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_limit numeric,
  ADD COLUMN IF NOT EXISTS daily_plan_lookback integer NOT NULL DEFAULT 90;