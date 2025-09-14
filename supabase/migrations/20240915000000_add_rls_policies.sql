-- Additional RLS policies and small schema enhancements for admin/user workflows

-- Add 'active' flag to profiles for enable/disable users
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Profiles: allow admins to manage all profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can manage all profiles'
  ) THEN
    CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    ));
  END IF;
END $$;

-- Subscriptions: allow users to insert their own requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Users can create their own subscriptions'
  ) THEN
    CREATE POLICY "Users can create their own subscriptions"
    ON public.subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Logs: allow users to insert and view their own logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'logs' AND policyname = 'Users can insert their own logs'
  ) THEN
    CREATE POLICY "Users can insert their own logs"
    ON public.logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'logs' AND policyname = 'Users can view their own logs'
  ) THEN
    CREATE POLICY "Users can view their own logs"
    ON public.logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;