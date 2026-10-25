import { supabase } from './supabase';

export interface OrganizationBenchmark {
  metric: string;
  target_value: string;
  unit: string;
  description: string;
}

export const DEFAULT_BENCHMARKS: Record<string, OrganizationBenchmark> = {
  target_rounds: {
    metric: 'target_rounds',
    target_value: '16',
    unit: 'rounds',
    description: 'Daily Japa Target Rounds',
  },
  wakeup_time: {
    metric: 'wakeup_time',
    target_value: '04:30',
    unit: 'time',
    description: 'Brahma Muhurta Wake-Up Target',
  },
  japa_completion_time: {
    metric: 'japa_completion_time',
    target_value: '12:00',
    unit: 'time',
    description: 'Target Rounds Completion Time',
  },
  reading_minutes: {
    metric: 'reading_minutes',
    target_value: '30',
    unit: 'minutes',
    description: 'Daily Reading Target',
  },
  hearing_minutes: {
    metric: 'hearing_minutes',
    target_value: '30',
    unit: 'minutes',
    description: 'Daily Hearing Target',
  },
};

/**
 * Fetches organization benchmarks for a specific BACE center from Supabase.
 * Falls back to default benchmark values if unconfigured.
 */
export const fetchCenterBenchmarks = async (
  baceId?: string | null
): Promise<Record<string, OrganizationBenchmark>> => {
  const benchmarks = { ...DEFAULT_BENCHMARKS };

  if (!baceId) return benchmarks;

  try {
    const { data, error } = await supabase
      .from('organization_benchmarks')
      .select('*')
      .eq('bace_id', baceId);

    if (error || !data || data.length === 0) {
      return benchmarks;
    }

    data.forEach((item) => {
      benchmarks[item.metric] = {
        metric: item.metric,
        target_value: item.target_value,
        unit: item.unit,
        description: item.description || DEFAULT_BENCHMARKS[item.metric]?.description || item.metric,
      };
    });
  } catch (e) {
    console.warn('Using default organization benchmarks due to fetch error:', e);
  }

  return benchmarks;
};

/**
 * Fetches personal benchmarks for an independent practitioner.
 * Checks profiles.personal_benchmarks or localStorage.
 */
export const fetchPersonalBenchmarks = async (
  userId?: string | null
): Promise<Record<string, OrganizationBenchmark>> => {
  const benchmarks = { ...DEFAULT_BENCHMARKS };
  if (!userId) return benchmarks;

  try {
    // 1. Try fetching from profiles
    const { data: prof } = await supabase
      .from('profiles')
      .select('personal_benchmarks')
      .eq('id', userId)
      .maybeSingle();

    const pb = prof?.personal_benchmarks || JSON.parse(localStorage.getItem(`personal_benchmarks_${userId}`) || 'null');

    if (pb) {
      if (pb.target_rounds) {
        benchmarks.target_rounds = {
          metric: 'target_rounds',
          target_value: String(pb.target_rounds),
          unit: 'rounds',
          description: 'Personal Daily Target Rounds',
        };
      }
      if (pb.wakeup_time) {
        benchmarks.wakeup_time = {
          metric: 'wakeup_time',
          target_value: pb.wakeup_time,
          unit: 'time',
          description: 'Personal Brahma Muhurta Wake-Up Standard',
        };
      }
      if (pb.japa_completion_time) {
        benchmarks.japa_completion_time = {
          metric: 'japa_completion_time',
          target_value: pb.japa_completion_time,
          unit: 'time',
          description: `Personal ${pb.target_rounds || '16'} Rounds Target Completion Time`,
        };
      }
      if (pb.reading_minutes) {
        benchmarks.reading_minutes = {
          metric: 'reading_minutes',
          target_value: String(pb.reading_minutes),
          unit: 'minutes',
          description: 'Personal Daily Reading Standard',
        };
      }
      if (pb.hearing_minutes) {
        benchmarks.hearing_minutes = {
          metric: 'hearing_minutes',
          target_value: String(pb.hearing_minutes),
          unit: 'minutes',
          description: 'Personal Daily Hearing Standard',
        };
      }
    }
  } catch (err) {
    console.warn('Using default personal benchmarks:', err);
  }

  return benchmarks;
};

/**
 * Saves personal benchmarks for an independent practitioner.
 */
export const savePersonalBenchmarks = async (
  userId: string,
  standards: {
    target_rounds: string;
    wakeup_time: string;
    japa_completion_time: string;
    reading_minutes: string;
    hearing_minutes: string;
  }
): Promise<void> => {
  // Store locally for instant offline persistence
  localStorage.setItem(`personal_benchmarks_${userId}`, JSON.stringify(standards));

  // Update Supabase profile
  try {
    await supabase
      .from('profiles')
      .update({ personal_benchmarks: standards })
      .eq('id', userId);
  } catch (e) {
    console.warn('Could not save personal benchmarks to DB column (will use local fallback):', e);
  }

  // Update user_metadata as well
  try {
    await supabase.auth.updateUser({
      data: { personal_benchmarks: standards }
    });
  } catch (e) {
    // ignore
  }
};

