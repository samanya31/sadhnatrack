import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Fetch all targets for a user
export const fetchUserTargets = async (userId: string) => {
  const { data, error } = await supabase
    .from('sadhana_targets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// Create a new target
export const createUserTarget = async (target: any) => {
  const { data, error } = await supabase
    .from('sadhana_targets')
    .insert([target])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Update target manual progress/completion
export const updateTargetCompletion = async (targetId: string, isCompleted: boolean) => {
  const { data, error } = await supabase
    .from('sadhana_targets')
    .update({ is_completed: isCompleted })
    .eq('id', targetId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateTargetProgressValue = async (targetId: string, progress: number, isCompleted?: boolean) => {
  const updateData: any = { current_progress: progress };
  if (isCompleted !== undefined) {
    updateData.is_completed = isCompleted;
  }
  const { data, error } = await supabase
    .from('sadhana_targets')
    .update(updateData)
    .eq('id', targetId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Delete target
export const deleteUserTarget = async (targetId: string) => {
  const { error } = await supabase
    .from('sadhana_targets')
    .delete()
    .eq('id', targetId);
  if (error) throw error;
};

// Calculate actual metric progress for a target range
export const calculateTargetActualProgress = async (userId: string, metric: string, startDate: string, endDate: string) => {
  if (metric === 'custom_milestone') return 0;
  
  const { data, error } = await supabase
    .from('sadhana_entries')
    .select(metric)
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) throw error;
  
  const total = (data || []).reduce((sum, entry: any) => sum + (entry[metric] || 0), 0);
  return total;
};

