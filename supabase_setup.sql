-- 1. Create BACEs table and handle upgrades
CREATE TABLE IF NOT EXISTS public.baces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  access_key TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure access_key exists on existing tables and is unique
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'baces' AND column_name = 'access_key') THEN
    ALTER TABLE public.baces ADD COLUMN access_key TEXT;
  END IF;
  
  -- Add unique constraint if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'baces_access_key_key') THEN
    ALTER TABLE public.baces ADD CONSTRAINT baces_access_key_key UNIQUE (access_key);
  END IF;
END $$;

-- 2. Create/Update profiles table structure (for new installs)
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

-- 3. Update profiles table safely
DO $$ 
BEGIN
  -- Add bace_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bace_id') THEN
    ALTER TABLE public.profiles ADD COLUMN bace_id UUID REFERENCES public.baces(id) ON DELETE SET NULL;
  END IF;

  -- Add gender if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
    ALTER TABLE public.profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));
  END IF;

  -- Add force_password_change if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'force_password_change') THEN
    ALTER TABLE public.profiles ADD COLUMN force_password_change BOOLEAN DEFAULT true NOT NULL;
  END IF;

  -- Update role check constraint if needed
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'super_admin'));
END $$;

-- 3. Create the sadhana_entries table (Maintains same structure)
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

-- Ensure both seva_done and seva_performed exist on existing sadhana_entries table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sadhana_entries' AND column_name = 'seva_done') THEN
    ALTER TABLE public.sadhana_entries ADD COLUMN seva_done BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sadhana_entries' AND column_name = 'seva_performed') THEN
    ALTER TABLE public.sadhana_entries ADD COLUMN seva_performed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.baces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sadhana_entries ENABLE ROW LEVEL SECURITY;

-- 5. ACCESS FUNCTIONS (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_bace()
RETURNS UUID AS $$
  SELECT bace_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_my_role() = 'super_admin';
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_my_role() IN ('admin', 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. POLICIES FOR 'baces'
DROP POLICY IF EXISTS "Super admins can manage BACEs" ON public.baces;
CREATE POLICY "Super admins can manage BACEs" ON public.baces
  FOR ALL USING ( public.is_super_admin() );

DROP POLICY IF EXISTS "All admins can view BACEs" ON public.baces;
CREATE POLICY "All admins can view BACEs" ON public.baces
  FOR SELECT USING ( public.is_any_admin() );

-- 7-- 8. POLICIES FOR 'profiles'
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins see all profiles" ON public.profiles;
CREATE POLICY "Super admins see all profiles" ON public.profiles
  FOR ALL USING ( public.is_super_admin() );

-- 8. Junction table for Multi-Center Admins
CREATE TABLE IF NOT EXISTS public.admin_baces (
  admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bace_id UUID REFERENCES public.baces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (admin_id, bace_id)
);

ALTER TABLE public.admin_baces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage admin_baces" ON public.admin_baces;
CREATE POLICY "Super admins can manage admin_baces" ON public.admin_baces
  FOR ALL USING ( public.is_super_admin() );

DROP POLICY IF EXISTS "Admins can view their own bace assignments" ON public.admin_baces;
CREATE POLICY "Admins can view their own bace assignments" ON public.admin_baces
  FOR SELECT USING ( auth.uid() = admin_id OR public.is_any_admin() );

CREATE OR REPLACE FUNCTION public.admin_has_bace(p_admin_id UUID, p_bace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND bace_id = p_bace_id
    UNION
    SELECT 1 FROM public.admin_baces WHERE admin_id = p_admin_id AND bace_id = p_bace_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

DROP POLICY IF EXISTS "BACE admins see students in their BACE" ON public.profiles;
CREATE POLICY "BACE admins see students in their BACE" ON public.profiles
  FOR ALL USING (
    public.get_my_role() = 'admin' AND public.admin_has_bace(auth.uid(), bace_id)
  );

-- 9. POLICIES FOR 'sadhana_entries'
DROP POLICY IF EXISTS "Students can manage own logs" ON public.sadhana_entries;
CREATE POLICY "Students can manage own logs" ON public.sadhana_entries
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins see all logs" ON public.sadhana_entries;
CREATE POLICY "Super admins see all logs" ON public.sadhana_entries
  FOR SELECT USING ( public.is_super_admin() );

DROP POLICY IF EXISTS "BACE admins see logs in their BACE" ON public.sadhana_entries;
CREATE POLICY "BACE admins see logs in their BACE" ON public.sadhana_entries
  FOR SELECT USING (
    public.get_my_role() = 'admin' 
    AND EXISTS (
      SELECT 1 FROM public.profiles student_p 
      WHERE student_p.id = sadhana_entries.user_id 
      AND public.admin_has_bace(auth.uid(), student_p.bace_id)
    )
  );

-- 10. Trigger for New Users (Sets force_password_change to true ONLY if created by admin)
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
  );
  
  -- If assigned bace_id and role is admin, record in admin_baces as well
  IF COALESCE(new.raw_user_meta_data->>'role', 'student') = 'admin' AND (new.raw_user_meta_data->>'bace_id') IS NOT NULL THEN
    INSERT INTO public.admin_baces (admin_id, bace_id)
    VALUES (new.id, (new.raw_user_meta_data->>'bace_id')::uuid)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Create the sadhana_targets table
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

-- Enable RLS
ALTER TABLE public.sadhana_targets ENABLE ROW LEVEL SECURITY;

-- Policies for sadhana_targets
DROP POLICY IF EXISTS "Students can manage own targets" ON public.sadhana_targets;
CREATE POLICY "Students can manage own targets" ON public.sadhana_targets
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins see all targets" ON public.sadhana_targets;
CREATE POLICY "Super admins see all targets" ON public.sadhana_targets
  FOR SELECT USING ( public.is_super_admin() );

DROP POLICY IF EXISTS "BACE admins see targets in their BACE" ON public.sadhana_targets;
CREATE POLICY "BACE admins see targets in their BACE" ON public.sadhana_targets
  FOR SELECT USING (
    public.get_my_role() = 'admin' 
    AND EXISTS (
      SELECT 1 FROM public.profiles student_p 
      WHERE student_p.id = sadhana_targets.user_id 
      AND public.admin_has_bace(auth.uid(), student_p.bace_id)
    )
  );

-- 12. Helper functions for code validation, password updates, and admin allotment
CREATE OR REPLACE FUNCTION public.get_bace_by_access_key(key_input TEXT)
RETURNS TABLE (id UUID, name TEXT) AS $$
  SELECT id, name FROM public.baces WHERE access_key = key_input;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.clear_force_password_change()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  UPDATE public.profiles
  SET force_password_change = false
  WHERE id = auth.uid();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.allot_admin_to_bace(p_admin_id UUID, p_bace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can allot center admins.';
  END IF;

  -- Ensure role is admin
  UPDATE public.profiles SET role = 'admin' WHERE id = p_admin_id;

  INSERT INTO public.admin_baces (admin_id, bace_id)
  VALUES (p_admin_id, p_bace_id)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. OTP Storage Table for Brevo API Email OTP Verification
CREATE TABLE IF NOT EXISTS public.password_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  type TEXT DEFAULT 'reset',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.password_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to password_otps" ON public.password_otps;
CREATE POLICY "Allow all access to password_otps" ON public.password_otps FOR ALL USING (true) WITH CHECK (true);

