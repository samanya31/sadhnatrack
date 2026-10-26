-- =========================================================================
-- User Account Deletion & Center Admin Deletion RPC & Policies
-- =========================================================================

-- Function allowing authenticated users to delete their own account,
-- or Center Admins / Super Admins to delete a student account
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_id UUID := auth.uid();
  calling_role TEXT;
  calling_bace_id UUID;
  target_bace_id UUID;
  actual_target UUID;
BEGIN
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If target_user_id is omitted or equals caller, caller is deleting self
  IF target_user_id IS NULL OR target_user_id = calling_user_id THEN
    actual_target := calling_user_id;
  ELSE
    actual_target := target_user_id;
    -- Verify caller is super_admin or admin of the same center
    SELECT role, bace_id INTO calling_role, calling_bace_id
    FROM public.profiles WHERE id = calling_user_id;

    IF calling_role = 'super_admin' THEN
      NULL;
    ELSIF calling_role = 'admin' THEN
      SELECT bace_id INTO target_bace_id
      FROM public.profiles WHERE id = actual_target;

      IF calling_bace_id IS NULL OR calling_bace_id != target_bace_id THEN
        RAISE EXCEPTION 'Admins can only delete students belonging to their own center';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unauthorized to delete user account';
    END IF;
  END IF;

  -- Delete associated user data first
  DELETE FROM public.sadhana_entries WHERE user_id = actual_target;
  DELETE FROM public.sadhana_targets WHERE user_id = actual_target;
  DELETE FROM public.profiles WHERE id = actual_target;
  
  -- Delete from auth.users (cascades where configured)
  BEGIN
    DELETE FROM auth.users WHERE id = actual_target;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

-- RLS Policies for deletion fallback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can delete own profile'
  ) THEN
    CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can delete center students'
  ) THEN
    CREATE POLICY "Admins can delete center students" ON public.profiles FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR (p.role = 'admin' AND p.bace_id = profiles.bace_id))
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sadhana_entries' AND policyname = 'Admins can delete center students entries'
  ) THEN
    CREATE POLICY "Admins can delete center students entries" ON public.sadhana_entries FOR DELETE USING (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR (p.role = 'admin' AND p.bace_id = (SELECT bace_id FROM public.profiles WHERE id = sadhana_entries.user_id)))
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sadhana_targets' AND policyname = 'Admins can delete center students targets'
  ) THEN
    CREATE POLICY "Admins can delete center students targets" ON public.sadhana_targets FOR DELETE USING (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR (p.role = 'admin' AND p.bace_id = (SELECT bace_id FROM public.profiles WHERE id = sadhana_targets.user_id)))
      )
    );
  END IF;
END $$;
