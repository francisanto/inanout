ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS salary_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_methods text[],
  ADD COLUMN IF NOT EXISTS category_limits jsonb NOT NULL DEFAULT '{}'::jsonb;