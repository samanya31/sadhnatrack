-- 1. Create a profiles table to handle user roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the sadhana_entries table
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
  -- Ensure one entry per student per day for reliable upsert
  UNIQUE(user_id, date)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sadhana_entries ENABLE ROW LEVEL SECURITY;

-- 4. Create a non-recursive admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. POLICIES FOR 'profiles'
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING ( public.is_admin() );

-- 6. POLICIES FOR 'sadhana_entries'
DROP POLICY IF EXISTS "Students can view own logs" ON public.sadhana_entries;
CREATE POLICY "Students can view own logs" ON public.sadhana_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert own logs" ON public.sadhana_entries;
CREATE POLICY "Students can insert own logs" ON public.sadhana_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own logs" ON public.sadhana_entries;
CREATE POLICY "Students can update own logs" ON public.sadhana_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all logs" ON public.sadhana_entries;
CREATE POLICY "Admins can view all logs" ON public.sadhana_entries
  FOR SELECT USING ( public.is_admin() );

-- 7. AUTOMATION: Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student'), 
    'student'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PROMOTE STAFF TO ADMIN
UPDATE public.profiles SET role = 'admin' WHERE email = 'sadhnastaff@gmail.com';
