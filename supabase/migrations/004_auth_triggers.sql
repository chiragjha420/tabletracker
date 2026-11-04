-- Migration 004: Automatic Profile Creation & Admin Approval Flow

-- Trigger function: automatically creates a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_user BOOLEAN;
  v_role TEXT;
  v_is_active BOOLEAN;
BEGIN
  -- Check if this is the first user in the system
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO v_first_user;

  IF v_first_user THEN
    v_role := 'ADMIN';
    v_is_active := true;
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'SUPERVISOR');
    v_is_active := false; -- Requires approval by admin
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    v_is_active,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policy allowing admins to update any profile's role and is_active status
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.current_user_role() = 'ADMIN')
WITH CHECK (public.current_user_role() = 'ADMIN');
