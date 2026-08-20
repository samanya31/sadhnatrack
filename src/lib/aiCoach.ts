import { supabase } from './supabase';
import { fetchCenterBenchmarks, type OrganizationBenchmark } from './benchmarks';
import { subDays, format } from 'date-fns';

export interface ReportSections {
  whatWentWell: string[];
  whatDeclined: string[];
  importantPatterns: string[];
  goalPerformance: string[];
  recommendations: string[];
}

export interface SADHANAReportResult {
  id?: string;
  reportType: 'weekly' | 'monthly';
  timeRangeStart: string;
  timeRangeEnd: string;
  sections: ReportSections;
  dataSnapshot: Record<string, any>;
  isCached: boolean;
  modelUsed: string;
  createdAt?: string;
}

/**
 * Checks if a user has generated a report in the last 24 hours.
 * If found, returns the cached report from Supabase.
 */
export const checkCachedSadhanaReport = async (
  userId: string,
  reportType: 'weekly' | 'monthly'
): Promise<SADHANAReportResult | null> => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('ai_sadhana_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('report_type', reportType)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const rawSections = data.report_content as ReportSections;
    const timeRangeDays = data.report_type === 'monthly' ? 30 : 7;

    const sanitizeItem = (item: string) => {
      return item
        .replace(/\(\d+\/7 days logged\)/g, (match) => {
          const num = parseInt(match.replace(/\D/g, ''), 10);
          return num > timeRangeDays ? `(${timeRangeDays}/${timeRangeDays} days logged)` : match;
        })
        .replace(/hours of daily reading/g, 'hours of reading over this period');
    };

    const sanitizedSections: ReportSections = {
      whatWentWell: (rawSections.whatWentWell || []).map(sanitizeItem),
      whatDeclined: (rawSections.whatDeclined || []).map(sanitizeItem),
      importantPatterns: (rawSections.importantPatterns || []).map(sanitizeItem),
      goalPerformance: (rawSections.goalPerformance || []).map(sanitizeItem),
      recommendations: (rawSections.recommendations || []).map(sanitizeItem),
    };

    return {
      id: data.id,
      reportType: data.report_type,
      timeRangeStart: data.time_range_start,
      timeRangeEnd: data.time_range_end,
      sections: sanitizedSections,
      dataSnapshot: data.data_snapshot,
      isCached: true,
      modelUsed: data.model,
      createdAt: data.created_at,
    };
  } catch (e) {
    return null;
  }
};

/**
 * Local Deterministic Rule-Based Fallback Engine
 * Used if Gemini API key is unconfigured or rate-limited.
 */
const generateDeterministicFallbackReport = (
  timeRangeDays: number,
  snapshot: Record<string, any>,
  benchmarks: Record<string, OrganizationBenchmark>
): ReportSections => {
  const wakeupTarget = benchmarks.wakeup_time?.target_value || '04:30';
  const japaTarget = benchmarks.japa_completion_time?.target_value || '12:00';

  const whatWentWell: string[] = [];
  const whatDeclined: string[] = [];
  const importantPatterns: string[] = [];
  const goalPerformance: string[] = [];
  const recommendations: string[] = [];

  const safeLogsSubmitted = Math.min(snapshot.logsSubmitted, timeRangeDays);

  // What went well
  if (snapshot.submissionRate >= 70) {
    whatWentWell.push(`Maintained strong logging consistency (${safeLogsSubmitted}/${timeRangeDays} days logged).`);
  }
  if (snapshot.totalReadingHours > 0) {
    whatWentWell.push(`Completed ${snapshot.totalReadingHours.toFixed(1)} hours of reading (Svadhyaya) over this period.`);
  }
  if (snapshot.japaByNoonRate >= 60) {
    whatWentWell.push(`Finished Japa rounds before center target time (${japaTarget}) on ${Math.round(snapshot.japaByNoonRate)}% of logged days.`);
  } else if (whatWentWell.length === 0) {
    whatWentWell.push('Showed dedicated intent by recording daily spiritual endeavors.');
  }

  // What declined
  if (snapshot.submissionRate < 70) {
    whatDeclined.push(`Log submission rate dropped to ${Math.round(snapshot.submissionRate)}% (${timeRangeDays - snapshot.logsSubmitted} days unrecorded).`);
  }
  if (snapshot.japaByNoonRate < 50) {
    whatDeclined.push(`Late Japa completion observed — completed before ${japaTarget} on only ${Math.round(snapshot.japaByNoonRate)}% of days.`);
  }
  if (snapshot.avgWakeupDecimal && snapshot.avgWakeupDecimal > 6.0) {
    whatDeclined.push(`Average wake-up time shifted later to ${snapshot.avgWakeup} (Center benchmark target is ${wakeupTarget}).`);
  }
  if (snapshot.avgDailyExerciseMins < 15) {
    whatDeclined.push(`Physical exercise averaged only ${snapshot.avgDailyExerciseMins}m/day (below the 15m daily health minimum). Physical lethargy directly impacts Japa alertness.`);
  }
  if (whatDeclined.length === 0) {
    whatDeclined.push('No severe decline observed; maintain momentum!');
  }

  // Important Patterns
  if (timeRangeDays <= 14) {
    importantPatterns.push(`On days you woke earlier, you generally completed Japa earlier (Average wake-up: ${snapshot.avgWakeup}).`);
  } else {
    importantPatterns.push(`Over the last ${timeRangeDays} days, earlier wake-up times were associated with faster Japa completion (Average wake-up: ${snapshot.avgWakeup}).`);
  }

  if (snapshot.totalReadingHours > 0 || snapshot.totalHearingHours > 0) {
    importantPatterns.push(`Combined Svadhyaya & Shravanam total: ${(snapshot.totalReadingHours + snapshot.totalHearingHours).toFixed(1)} hours.`);
  }

  // Goal Performance
  if (snapshot.activeTargetsCount > 0) {
    goalPerformance.push(`${snapshot.targetsCompletedCount} of ${snapshot.activeTargetsCount} active spiritual targets currently completed.`);
  } else {
    goalPerformance.push('No specific active targets set for this period. Setting weekly targets improves habit retention.');
  }

  // Recommendations
  recommendations.push(`According to your center's configured benchmark (${wakeupTarget}), aim to gradually shift wake-up time 15 minutes earlier.`);
  recommendations.push(`Complete at least 4-8 rounds of Japa in Brahma Muhurta before 7:00 AM.`);
  if (snapshot.avgDailyExerciseMins < 15) {
    recommendations.push(`Commit to at least 15-20 minutes of daily physical exercise (brisk walk, yoga, or workout) to maintain physical stamina and avoid health fatigue.`);
  } else {
    recommendations.push(`Block a fixed 20-minute daily slot for Shravanam or reading Bhagavad-gita.`);
  }

  return {
    whatWentWell,
    whatDeclined,
    importantPatterns,
    goalPerformance,
    recommendations,
  };
};

/**
 * Main RAG Report Generator Function
 */
export const generateSadhanaReport = async (
  userId: string,
  timeRangeDays: number = 7,
  forceRefresh: boolean = false
): Promise<SADHANAReportResult> => {
  const reportType: 'weekly' | 'monthly' = timeRangeDays > 14 ? 'monthly' : 'weekly';

  // 1. Check 24-hour cache if not forcing refresh
  if (!forceRefresh) {
    const cached = await checkCachedSadhanaReport(userId, reportType);
    if (cached) return cached;
  }

  // 2. Compute Data Snapshot (Exact timeRangeDays window, inclusive of today)
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), timeRangeDays - 1), 'yyyy-MM-dd');

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*, bace:baces!bace_id(name)')
    .eq('id', userId)
    .single();

  const baceId = userProfile?.bace_id || null;
  const benchmarks = await fetchCenterBenchmarks(baceId);

  const { data: entries } = await supabase
    .from('sadhana_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  const { data: targets } = await supabase
    .from('sadhana_targets')
    .select('*')
    .eq('user_id', userId);

  const userEntries = entries || [];
  const activeTargets = targets || [];

  // Compute metrics
  let totalWakeupMinutes = 0;
  let wakeupCount = 0;
  let japaByTargetCount = 0;
  let totalReadingMins = 0;
  let totalHearingMins = 0;
  let totalExerciseMins = 0;

  const targetNoonHour = parseInt((benchmarks.japa_completion_time?.target_value || '12:00').split(':')[0], 10) || 12;

  userEntries.forEach((e) => {
    if (e.wakeup_time) {
      const parts = e.wakeup_time.split(':');
      if (parts.length >= 2) {
        totalWakeupMinutes += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        wakeupCount++;
      }
    }

    if (e.rounds_completed_by) {
      const hour = parseInt(e.rounds_completed_by.split(':')[0], 10);
      if (!isNaN(hour) && hour <= targetNoonHour) japaByTargetCount++;
    }

    totalReadingMins += e.reading_minutes || 0;
    totalHearingMins += e.hearing_minutes || 0;
    totalExerciseMins += e.exercise_minutes || 0;
  });

  const avgWakeupMins = wakeupCount > 0 ? totalWakeupMinutes / wakeupCount : 330; // default 5:30 AM
  const avgWakeupHour = Math.floor(avgWakeupMins / 60);
  const avgWakeupMin = Math.round(avgWakeupMins % 60);
  const avgWakeupStr = `${String(avgWakeupHour).padStart(2, '0')}:${String(avgWakeupMin).padStart(2, '0')}`;

  const avgDailyExerciseMins = userEntries.length > 0 ? Math.round(totalExerciseMins / userEntries.length) : 0;
  const completedTargetsCount = activeTargets.filter((t) => t.is_completed).length;

  const logsSubmittedCount = Math.min(userEntries.length, timeRangeDays);

  const snapshot = {
    userName: userProfile?.full_name || 'Devotee',
    baceName: userProfile?.bace?.name || 'Center',
    timeRangeDays,
    logsSubmitted: logsSubmittedCount,
    submissionRate: Math.min(100, (userEntries.length / timeRangeDays) * 100),
    avgWakeup: avgWakeupStr,
    avgWakeupDecimal: avgWakeupMins / 60,
    japaByNoonRate: userEntries.length > 0 ? (japaByTargetCount / userEntries.length) * 100 : 0,
    totalReadingHours: totalReadingMins / 60,
    totalHearingHours: totalHearingMins / 60,
    avgDailyExerciseMins,
    activeTargetsCount: activeTargets.length,
    targetsCompletedCount: completedTargetsCount,
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  let sections: ReportSections;
  let modelUsed = 'deterministic-rule-engine';

  if (apiKey) {
    try {
      const promptText = `
You are an experienced, compassionate ISKCON Spiritual Mentor analyzing sadhana logs for ${snapshot.userName} (${snapshot.baceName}).

[CENTER CONFIGURABLE BENCHMARKS]
- Wake-up Target: ${benchmarks.wakeup_time?.target_value || '04:30 AM'}
- Japa Target Completion: ${benchmarks.japa_completion_time?.target_value || '12:00 PM'}
- Daily Reading Target: ${benchmarks.reading_minutes?.target_value || '30'} minutes
- Daily Hearing Target: ${benchmarks.hearing_minutes?.target_value || '30'} minutes

[STUDENT DATA SNAPSHOT (${timeRangeDays} Days)]
- Logs Submitted: ${snapshot.logsSubmitted} / ${timeRangeDays} days (${snapshot.submissionRate.toFixed(0)}% consistency)
- Average Wake-up Time: ${snapshot.avgWakeup}
- Japa Finished by Target Time (${benchmarks.japa_completion_time?.target_value}): ${snapshot.japaByNoonRate.toFixed(0)}% of logged days
- Total Svadhyaya (Reading): ${snapshot.totalReadingHours.toFixed(1)} hours
- Total Shravanam (Hearing): ${snapshot.totalHearingHours.toFixed(1)} hours
- Average Daily Physical Exercise: ${snapshot.avgDailyExerciseMins} minutes/day (Minimum Health Standard: 15 mins/day)
- Active Targets Progress: ${snapshot.targetsCompletedCount} / ${snapshot.activeTargetsCount} targets completed

[ANALYTICAL RIGOR & HEALTH VALIDITY RULES]
1. Always ground statements in: "According to your center's configured benchmark..." when referencing benchmarks.
2. DO NOT claim overconfident statistical correlation on small observation windows (${timeRangeDays} days).
   - For 7-day windows: Use observational phrasing like "On days you woke earlier, you generally completed Japa earlier."
   - For 30-day windows: Use defensible analytical phrasing like "Over the last 30 days, earlier wake-up times were associated with faster Japa completion."
3. PHYSICAL HEALTH & EXERCISE RULE: If average daily exercise is less than 15 minutes/day (${snapshot.avgDailyExerciseMins}m/day), explicitly warn in "whatDeclined" or "recommendations" that insufficient physical activity causes physical lethargy, reduced mental alertness during Japa, and long-term health consequences. Recommend at least 15–20 mins of daily physical exercise (brisk walk/yoga/workout).
4. READING & HEARING HOUR PHRASING: Total reading hours (${snapshot.totalReadingHours.toFixed(1)} hrs) represents the total cumulative reading over the entire ${timeRangeDays}-day period. NEVER call it "daily reading" — phrasing MUST be "Completed ${snapshot.totalReadingHours.toFixed(1)} hours of reading (Svadhyaya) over this period."

Return ONLY a valid JSON object matching this exact schema without markdown formatting or code fences:
{
  "whatWentWell": ["string", "string"],
  "whatDeclined": ["string", "string"],
  "importantPatterns": ["string", "string"],
  "goalPerformance": ["string", "string"],
  "recommendations": ["string", "string", "string"]
}
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawText) {
        const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
        sections = {
          whatWentWell: parsed.whatWentWell || [],
          whatDeclined: parsed.whatDeclined || [],
          importantPatterns: parsed.importantPatterns || [],
          goalPerformance: parsed.goalPerformance || [],
          recommendations: parsed.recommendations || [],
        };
        modelUsed = 'gemini-1.5-flash';
      } else {
        throw new Error('No text returned from Gemini API');
      }
    } catch (err) {
      console.warn('Gemini API call failed or unconfigured, fallback to rule engine:', err);
      sections = generateDeterministicFallbackReport(timeRangeDays, snapshot, benchmarks);
    }
  } else {
    sections = generateDeterministicFallbackReport(timeRangeDays, snapshot, benchmarks);
  }

  return {
    reportType,
    timeRangeStart: startDate,
    timeRangeEnd: endDate,
    sections,
    dataSnapshot: snapshot,
    isCached: false,
    modelUsed,
  };
};

/**
 * Saves a generated report snapshot to the Supabase `ai_sadhana_reports` table.
 */
export const saveSadhanaReport = async (
  userId: string,
  baceId: string | null,
  report: SADHANAReportResult
) => {
  const { data, error } = await supabase
    .from('ai_sadhana_reports')
    .insert({
      user_id: userId,
      bace_id: baceId,
      time_range_start: report.timeRangeStart,
      time_range_end: report.timeRangeEnd,
      report_type: report.reportType,
      report_content: report.sections,
      data_snapshot: report.dataSnapshot,
      model: report.modelUsed,
      prompt_version: 'v1.0',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
