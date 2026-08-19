import { supabase } from './supabase';

export interface OrganizationBenchmark {
  metric: string;
  target_value: string;
  unit: string;
  description: string;
}

export const DEFAULT_BENCHMARKS: Record<string, OrganizationBenchmark> = {
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
    description: '16 Rounds Target Completion Time (Noon)',
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
