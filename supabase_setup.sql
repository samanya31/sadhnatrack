-- 1. Create BACEs table and handle upgrades
CREATE TABLE IF NOT EXISTS public.baces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  access_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure access_key exists on existing tables
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'baces' AND column_name = 'access_key') THEN
    ALTER TABLE public.baces ADD COLUMN access_key TEXT;
  END IF;
END $$;

-- 2. Update profiles table safely
DO $$ 
BEGIN
  -- Add bace_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bace_id') THEN
    ALTER TABLE public.profiles ADD COLUMN bace_id UUID REFERENCES public.baces(id) ON DELETE SET NULL;
  END IF;

  -- Update role check constraint if needed
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'super_admin'));
END $$;

-- 3. Create/Update profiles table structure (for new installs)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'super_admin')),
  bace_id UUID REFERENCES public.baces(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
  seva_performed BOOLEAN DEFAULT false NOT NULL,
  seva_minutes INTEGER DEFAULT 0 NOT NULL,
  seva_topic TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  mangal_arti BOOLEAN DEFAULT false NOT NULL,
  tulasi_arti BOOLEAN DEFAULT false NOT NULL,
  morning_japa BOOLEAN DEFAULT false NOT NULL,
  morning_hearing BOOLEAN DEFAULT false NOT NULL,
  morning_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

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

-- 7. POLICIES FOR 'profiles'
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins see all profiles" ON public.profiles;
CREATE POLICY "Super admins see all profiles" ON public.profiles
  FOR ALL USING ( public.is_super_admin() );

DROP POLICY IF EXISTS "BACE admins see students in their BACE" ON public.profiles;
CREATE POLICY "BACE admins see students in their BACE" ON public.profiles
  FOR ALL USING (
    public.get_my_role() = 'admin' AND public.get_my_bace() = bace_id
  );

-- 8. POLICIES FOR 'sadhana_entries'
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
      AND student_p.bace_id = public.get_my_bace()
    )
  );

-- 9. Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, bace_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student'), 
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    (new.raw_user_meta_data->>'bace_id')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Initial Setup: Promote existing admin to Super Admin
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'sadhnastaff@gmail.com';
