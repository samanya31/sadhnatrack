-- ========================================================
-- SADHANA TRACK - MASTER SUPABASE SQL SETUP SCRIPT
-- ========================================================

-- 1. Create BACEs Table & Add Upgrades
CREATE TABLE IF NOT EXISTS public.baces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  access_key TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure access_key column and unique constraint exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'baces' AND column_name = 'access_key') THEN
    ALTER TABLE public.baces ADD COLUMN access_key TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'baces_access_key_key') THEN
    ALTER TABLE public.baces ADD CONSTRAINT baces_access_key_key UNIQUE (access_key);
  END IF;
END $$;

-- 2. Create Profiles Table (for user roles, BACE assignment, and gender)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'super_admin')),
  bace_id UUID REFERENCES public.baces(id) ON DELETE SET NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  force_password_change BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add missing columns to profiles if upgraded
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bace_id') THEN
    ALTER TABLE public.profiles ADD COLUMN bace_id UUID REFERENCES public.baces(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
    ALTER TABLE public.profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'force_password_change') THEN
    ALTER TABLE public.profiles ADD COLUMN force_password_change BOOLEAN DEFAULT true NOT NULL;
  END IF;

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'super_admin'));
END $$;

-- 3. Create Multi-Center Admin Junction Table
CREATE TABLE IF NOT EXISTS public.admin_baces (
  admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bace_id UUID REFERENCES public.baces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (admin_id, bace_id)
);

-- 4. Create Sadhana Entries Table
CREATE TABLE IF NOT EXISTS public.sadhana_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  wakeup_time TIME,
  sleep_time TIME,
  rounds_completed INTEGER DEFAULT 0 NOT NULL,
  rounds_completed_by TIME,
  rounds_description TEXT,
  hearing_done BOOLEAN DEFAULT false NOT NULL,
  hearing_minutes INTEGER DEFAULT 0 NOT NULL,
  hearing_title TEXT,
  hearing_speaker TEXT,
  reading_done BOOLEAN DEFAULT false NOT NULL,
  reading_minutes INTEGER DEFAULT 0 NOT NULL,
  reading_book TEXT,
  reading_sloka TEXT,
  seva_done BOOLEAN DEFAULT false NOT NULL,
  seva_performed BOOLEAN DEFAULT false NOT NULL,
  seva_minutes INTEGER DEFAULT 0 NOT NULL,
  seva_topic TEXT,
  exercise_done BOOLEAN DEFAULT false NOT NULL,
  exercise_minutes INTEGER DEFAULT 0 NOT NULL,
  exercise_description TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  mangal_arti BOOLEAN DEFAULT false NOT NULL,
  tulasi_arti BOOLEAN DEFAULT false NOT NULL,
  morning_japa BOOLEAN DEFAULT false NOT NULL,
  morning_hearing BOOLEAN DEFAULT false NOT NULL,
  morning_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- 5. Create Sadhana Targets Table
CREATE TABLE IF NOT EXISTS public.sadhana_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'custom')),
  metric TEXT NOT NULL CHECK (metric IN ('reading_minutes', 'hearing_minutes', 'rounds_completed', 'seva_minutes', 'exercise_minutes', 'custom_milestone')),
  target_value NUMERIC NOT NULL,
  current_progress NUMERIC DEFAULT 0 NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_date_range CHECK (start_date <= end_date)
);

-- 6. Create OTP Storage Table for Brevo API Email OTP Verification
CREATE TABLE IF NOT EXISTS public.password_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  type TEXT DEFAULT 'reset',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Enable Row Level Security (RLS) across all tables
ALTER TABLE public.baces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_baces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sadhana_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sadhana_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_otps ENABLE ROW LEVEL SECURITY;

-- 8. Clean up all previous policies to avoid conflicts
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- 9. Create NON-RECURSIVE RLS Policies
-- Profiles: Any authenticated user can read profiles; users can insert/update own profile
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- BACEs & Admin_BACEs: Read-only for authenticated users
CREATE POLICY "baces_select_all" ON public.baces
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_baces_select_all" ON public.admin_baces
  FOR SELECT USING (auth.role() = 'authenticated');

-- Sadhana Entries & Targets: Full access for authenticated users
CREATE POLICY "sadhana_entries_all" ON public.sadhana_entries
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "sadhana_targets_all" ON public.sadhana_targets
  FOR ALL USING (auth.role() = 'authenticated');

-- Password OTPs: Open access for verification
CREATE POLICY "password_otps_all" ON public.password_otps
  FOR ALL USING (true) WITH CHECK (true);

-- 10. Helper Functions (SECURITY DEFINER to run with creator privileges)
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(p_email))
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_bace()
RETURNS UUID AS $$
  SELECT bace_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin', false);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'), false);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_has_bace(p_admin_id UUID, p_bace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND bace_id = p_bace_id
    UNION
    SELECT 1 FROM public.admin_baces WHERE admin_id = p_admin_id AND bace_id = p_bace_id
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_bace_by_access_key(key_input TEXT)
RETURNS TABLE (id UUID, name TEXT) AS $$
  SELECT id, name FROM public.baces WHERE access_key = key_input;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.clear_force_password_change()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles SET force_password_change = false WHERE id = auth.uid();
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.make_me_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles SET role = 'super_admin' WHERE id = auth.uid();
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.allot_admin_to_bace(p_admin_id UUID, p_bace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can allot center admins.';
  END IF;

  UPDATE public.profiles SET role = 'admin' WHERE id = p_admin_id;

  INSERT INTO public.admin_baces (admin_id, bace_id)
  VALUES (p_admin_id, p_bace_id)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.remove_admin_from_bace(p_admin_id UUID, p_bace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can remove center admin allotments.';
  END IF;

  DELETE FROM public.admin_baces
  WHERE admin_id = p_admin_id AND bace_id = p_bace_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Trigger Function for New User Creation via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_created_by_admin BOOLEAN;
  v_force_change BOOLEAN;
BEGIN
  v_created_by_admin := COALESCE((new.raw_user_meta_data->>'created_by_admin')::boolean, false);
  v_force_change := COALESCE((new.raw_user_meta_data->>'force_password_change')::boolean, v_created_by_admin);

  INSERT INTO public.profiles (id, email, full_name, role, bace_id, gender, force_password_change)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student'), 
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    (new.raw_user_meta_data->>'bace_id')::uuid,
    NULLIF(new.raw_user_meta_data->>'gender', ''),
    v_force_change
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    bace_id = COALESCE(EXCLUDED.bace_id, public.profiles.bace_id),
    gender = COALESCE(EXCLUDED.gender, public.profiles.gender);
  
  IF COALESCE(new.raw_user_meta_data->>'role', 'student') = 'admin' AND (new.raw_user_meta_data->>'bace_id') IS NOT NULL THEN
    INSERT INTO public.admin_baces (admin_id, bace_id)
    VALUES (new.id, (new.raw_user_meta_data->>'bace_id')::uuid)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. RPC Function for Resetting User Password via Verified Brevo OTP
CREATE OR REPLACE FUNCTION public.reset_user_password_with_otp(
  p_email TEXT,
  p_otp_code TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_otp_id UUID;
BEGIN
  -- 1. Check if OTP is valid & not expired in password_otps
  SELECT id INTO v_otp_id
  FROM public.password_otps
  WHERE lower(email) = lower(p_email)
    AND otp_code = p_otp_code
    AND expires_at >= NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_otp_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired OTP verification code.';
  END IF;

  -- 2. Find user in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user account found for this email address.';
  END IF;

  -- 3. Update password in auth.users
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  WHERE id = v_user_id;

  -- 4. Clear force_password_change in profiles
  UPDATE public.profiles
  SET force_password_change = false
  WHERE id = v_user_id;

  -- 5. Delete used OTP
  DELETE FROM public.password_otps WHERE id = v_otp_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;
