-- ========================================================
-- AI SADHNA COACH & SMART INTELLIGENCE MIGRATION SCRIPT (FIXED)
-- ========================================================

-- 1. Organization Configurable Benchmarks (Per BACE Center)
CREATE TABLE IF NOT EXISTS organization_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bace_id UUID REFERENCES baces(id) ON DELETE CASCADE,
  metric VARCHAR(50) NOT NULL, -- 'wakeup_time', 'japa_completion_time', 'reading_minutes', 'hearing_minutes'
  target_value VARCHAR(50) NOT NULL, -- e.g. '04:30', '12:00', '30', '30'
  unit VARCHAR(20) NOT NULL, -- 'time', 'minutes', 'rounds'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_bace_metric UNIQUE (bace_id, metric)
);

-- 2. AI Sadhana Reports & Data Snapshots
CREATE TABLE IF NOT EXISTS ai_sadhana_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bace_id UUID REFERENCES baces(id) ON DELETE SET NULL,
  time_range_start DATE NOT NULL,
  time_range_end DATE NOT NULL,
  report_type VARCHAR(20) NOT NULL, -- 'weekly' | 'monthly'
  report_content JSONB NOT NULL, -- Stores 5 sections: what_went_well, what_declined, patterns, goal_performance, recommendations
  data_snapshot JSONB NOT NULL, -- Aggregated snapshot (avg_wakeup, japa_by_noon_rate, reading_hours, target_progress)
  model VARCHAR(50) NOT NULL DEFAULT 'gemini-1.5-flash',
  prompt_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE organization_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sadhana_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read access to organization benchmarks" ON organization_benchmarks;
DROP POLICY IF EXISTS "Allow authenticated to modify organization benchmarks" ON organization_benchmarks;
DROP POLICY IF EXISTS "Allow users to read their own AI reports" ON ai_sadhana_reports;
DROP POLICY IF EXISTS "Allow users to insert their own AI reports" ON ai_sadhana_reports;
DROP POLICY IF EXISTS "Allow users to delete their own AI reports" ON ai_sadhana_reports;

-- Re-create clean RLS Policies
CREATE POLICY "Allow public read access to organization benchmarks"
  ON organization_benchmarks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to modify organization benchmarks"
  ON organization_benchmarks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow users to read their own AI reports"
  ON ai_sadhana_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to insert their own AI reports"
  ON ai_sadhana_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own AI reports"
  ON ai_sadhana_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
