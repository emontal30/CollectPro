-- Add missing profile insert policy and promote a specific user to admin
-- Safe to run multiple times

-- 1) Profiles: allow users to create their own profile (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2) Promote admin account by email (no-op if email not found)
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'emontal.33@gmail.com' LIMIT 1
)
INSERT INTO public.profiles (id, first_name, last_name, role, active)
SELECT id, 'Admin', 'User', 'admin', TRUE FROM admin_user
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    active = TRUE,
    updated_at = NOW();