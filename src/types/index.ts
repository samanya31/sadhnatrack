export type UserRole = 'student' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface SadhanaEntry {
  id: string;
  user_id: string;
  date: string;
  wakeup_time: string;
  sleep_time?: string;
  rounds_completed: number;
  rounds_completed_by: string;
  hearing_done: boolean;
  hearing_minutes: number;
  hearing_title: string;   // This will be "Topic"
  hearing_speaker?: string; // New
  reading_done: boolean;
  reading_minutes: number;
  reading_book?: string;
  reading_sloka?: string;
  seva_performed: boolean;
  seva_minutes?: number;
  seva_topic?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}
