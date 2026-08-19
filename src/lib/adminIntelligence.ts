import { supabase } from './supabase';
import { fetchCenterBenchmarks } from './benchmarks';
import { subDays, format, differenceInDays } from 'date-fns';

export interface StudentRiskProfile {
  studentId: string;
  fullName: string;
  baceName: string;
  phone?: string;
  daysInactive?: number;
  lastLoggedDate?: string;
  reason: string;
  whatsappMessage?: string;
}

export interface BaceHealthAnalysis {
  totalStudents: number;
  centerHealthScore: number;
  inactiveStudents: StudentRiskProfile[];
  decliningStudents: StudentRiskProfile[];
  topPerformers: StudentRiskProfile[];
}

/**
 * Deterministic Rule-Based Admin Mentoring Intelligence Engine (0 LLM Cost)
 * Evaluates all center students against center-specific organization benchmarks.
 */
export const analyzeBaceStudentsHealth = async (
  baceId?: string | null
): Promise<BaceHealthAnalysis> => {
  // 1. Fetch Center Benchmarks
  const benchmarks = await fetchCenterBenchmarks(baceId);
  const wakeupTarget = benchmarks.wakeup_time?.target_value || '04:30';
  const japaTargetTime = benchmarks.japa_completion_time?.target_value || '12:00';
  const targetNoonHour = parseInt(japaTargetTime.split(':')[0], 10) || 12;

  // 2. Fetch Students
  let query = supabase
    .from('profiles')
    .select('*, bace:baces!bace_id(name)')
    .eq('role', 'student');

  if (baceId) {
    query = query.eq('bace_id', baceId);
  }

  const { data: students, error: studentErr } = await query;
  if (studentErr || !students || students.length === 0) {
    return {
      totalStudents: 0,
      centerHealthScore: 100,
      inactiveStudents: [],
      decliningStudents: [],
      topPerformers: [],
    };
  }

  const studentIds = students.map((s) => s.id);
  const fourteenDaysAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd');

  // 3. Fetch 14-day entries for all students
  const { data: entries } = await supabase
    .from('sadhana_entries')
    .select('*')
    .in('user_id', studentIds)
    .gte('date', fourteenDaysAgo)
    .order('date', { ascending: false });

  // Map entries by user
  const entriesByUser: Record<string, any[]> = {};
  (entries || []).forEach((e) => {
    if (!entriesByUser[e.user_id]) entriesByUser[e.user_id] = [];
    entriesByUser[e.user_id].push(e);
  });

  const inactiveStudents: StudentRiskProfile[] = [];
  const decliningStudents: StudentRiskProfile[] = [];
  const topPerformers: StudentRiskProfile[] = [];
  let totalActiveScored = 0;

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // 4. Evaluate each student against center benchmarks
  students.forEach((student) => {
    const userEntries = entriesByUser[student.id] || [];
    const latestEntry = userEntries[0];

    // Check Inactivity (3+ days missing)
    let daysInactive = 14;
    if (latestEntry?.date) {
      daysInactive = differenceInDays(new Date(todayStr), new Date(latestEntry.date));
    }

    if (daysInactive >= 3 || userEntries.length === 0) {
      const msg = encodeURIComponent(
        `Hare Krishna ${student.full_name}! We missed your daily Sadhana log on AI Sadhna Coach. Please take 60 seconds to update your log today. Grateful for your steady endeavor!`
      );
      inactiveStudents.push({
        studentId: student.id,
        fullName: student.full_name || 'Devotee',
        baceName: student.bace?.name || 'BACE Center',
        daysInactive: daysInactive > 14 ? 14 : daysInactive,
        lastLoggedDate: latestEntry?.date || 'Never',
        reason: `No sadhana logged in the last ${daysInactive} days`,
        whatsappMessage: `https://wa.me/${student.phone ? student.phone.replace(/[^0-9]/g, '') : ''}?text=${msg}`,
      });
      return;
    }

    // Evaluate Sadhana At Risk vs Center Benchmarks
    const last7DaysEntries = userEntries.slice(0, 7);
    let japaByTargetCount = 0;
    let lateWakeupCount = 0;

    const targetWakeupHour = parseInt(wakeupTarget.split(':')[0], 10) || 4;

    last7DaysEntries.forEach((e) => {
      if (e.rounds_completed_by) {
        const hour = parseInt(e.rounds_completed_by.split(':')[0], 10);
        if (!isNaN(hour) && hour <= targetNoonHour) japaByTargetCount++;
      }

      if (e.wakeup_time) {
        const hour = parseInt(e.wakeup_time.split(':')[0], 10);
        if (!isNaN(hour) && hour > targetWakeupHour + 1) {
          lateWakeupCount++;
        }
      }
    });

    const japaRate = last7DaysEntries.length > 0 ? (japaByTargetCount / last7DaysEntries.length) * 100 : 0;

    if (japaRate < 50 || lateWakeupCount >= 3) {
      decliningStudents.push({
        studentId: student.id,
        fullName: student.full_name || 'Devotee',
        baceName: student.bace?.name || 'BACE Center',
        reason: `Japa completed before ${japaTargetTime} on only ${japaRate.toFixed(0)}% of days (Center benchmark target: ${wakeupTarget} wake-up).`,
      });
    } else if (last7DaysEntries.length >= 5) {
      topPerformers.push({
        studentId: student.id,
        fullName: student.full_name || 'Devotee',
        baceName: student.bace?.name || 'BACE Center',
        reason: `Consistent Brahma Muhurta wake-up (${wakeupTarget}) with 100% daily logging adherence.`,
      });
      totalActiveScored++;
    }
  });

  const centerHealthScore = students.length > 0
    ? Math.round(((students.length - inactiveStudents.length - decliningStudents.length) / students.length) * 100)
    : 100;

  return {
    totalStudents: students.length,
    centerHealthScore: centerHealthScore < 0 ? 0 : centerHealthScore,
    inactiveStudents,
    decliningStudents,
    topPerformers,
  };
};
