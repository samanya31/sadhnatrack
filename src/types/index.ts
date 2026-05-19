export type UserRole = 'student' | 'admin' | 'super_admin';

export interface BACE {
  id: string;
  name: string;
  access_key: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  bace_id?: string;
  created_at: string;
  bace?: BACE;
}

export interface SadhanaEntry {
  id: string;
  user_id: string;
  date: string;
  wakeup_time: string;
  sleep_time?: string;
  rounds_completed: number;
  rounds_completed_by: string;
  rounds_description?: string; // New: e.g. "8 morning, 8 night"
  hearing_done: boolean;
  hearing_minutes: number;
  hearing_title: string;
  hearing_speaker?: string;
  reading_done: boolean;
  reading_minutes: number;
  reading_book?: string;
  reading_sloka?: string;
  seva_performed: boolean;
  seva_minutes?: number;
  seva_topic?: string;
  exercise_done: boolean;
  exercise_minutes: number;
  exercise_description?: string;
  mangal_arti: boolean;
  tulasi_arti: boolean;
  morning_japa: boolean;
  morning_hearing: boolean;
  morning_comment?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}
