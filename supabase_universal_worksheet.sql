-- Universal Worksheet Tracker migration for an existing Ace Club LMS Supabase project.
-- Run this in Supabase SQL Editor after the base LMS tables already exist.

CREATE TABLE public.master_worksheet_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX master_worksheet_plans_one_active
  ON public.master_worksheet_plans(is_active)
  WHERE is_active = true;

CREATE TABLE public.master_worksheet_session_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.master_worksheet_plans(id) ON DELETE CASCADE NOT NULL,
  master_session_id UUID REFERENCES public.master_sessions(id) ON DELETE CASCADE NOT NULL,
  session_number INTEGER NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('quant', 'verbal', 'di')),
  start_question INTEGER NOT NULL DEFAULT 1 CHECK (start_question > 0),
  end_question INTEGER NOT NULL DEFAULT 50 CHECK (end_question >= start_question),
  daily_target_count INTEGER NOT NULL DEFAULT 10 CHECK (daily_target_count > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, master_session_id)
);

CREATE TABLE public.worksheet_daily_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.master_worksheet_plans(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  master_rule_id UUID REFERENCES public.master_worksheet_session_rules(id) ON DELETE SET NULL,
  target_date DATE NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('quant', 'verbal', 'di')),
  question_start INTEGER NOT NULL CHECK (question_start > 0),
  question_end INTEGER NOT NULL CHECK (question_end >= question_start),
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  range_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, session_id, section, target_date, question_start, question_end)
);

CREATE TABLE public.student_worksheet_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID REFERENCES public.worksheet_daily_targets(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('quant', 'verbal', 'di')),
  attempted_count INTEGER NOT NULL DEFAULT 0 CHECK (attempted_count >= 0),
  attempted_range TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_id, user_id)
);

ALTER TABLE public.master_worksheet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_worksheet_session_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_daily_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_worksheet_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Worksheet plans viewable by enrolled users" ON public.master_worksheet_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can manage master worksheet plans" ON public.master_worksheet_plans
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Worksheet rules viewable by enrolled users" ON public.master_worksheet_session_rules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can manage worksheet rules" ON public.master_worksheet_session_rules
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Enrolled students can view worksheet targets" ON public.worksheet_daily_targets
  FOR SELECT USING (
    is_active = true
    AND (
      EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = worksheet_daily_targets.course_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );
CREATE POLICY "Admins can manage worksheet targets" ON public.worksheet_daily_targets
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Students can view own worksheet logs" ON public.student_worksheet_logs
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Students can insert own worksheet logs" ON public.student_worksheet_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = student_worksheet_logs.course_id AND user_id = auth.uid())
  );
CREATE POLICY "Students can update own worksheet logs" ON public.student_worksheet_logs
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage worksheet logs" ON public.student_worksheet_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.next_worksheet_weekday(p_date DATE)
RETURNS DATE AS $$
DECLARE
  day_number INTEGER;
BEGIN
  day_number := EXTRACT(DOW FROM p_date);
  IF day_number = 0 THEN
    RETURN p_date + 1;
  ELSIF day_number = 6 THEN
    RETURN p_date + 2;
  END IF;
  RETURN p_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.sync_course_worksheet_targets(p_course_id UUID)
RETURNS INTEGER AS $$
DECLARE
  active_plan_id UUID;
  generated_count INTEGER := 0;
  sess RECORD;
  rule RECORD;
  q_start INTEGER;
  q_end INTEGER;
  target_day DATE;
BEGIN
  SELECT id INTO active_plan_id
  FROM public.master_worksheet_plans
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF active_plan_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.worksheet_daily_targets target
  SET is_active = false
  WHERE target.course_id = p_course_id
    AND target.plan_id = active_plan_id
    AND target.is_active = true;

  FOR sess IN
    SELECT id, course_id, session_number, session_date
    FROM public.sessions
    WHERE course_id = p_course_id
      AND is_published = true
    ORDER BY session_number
  LOOP
    FOR rule IN
      SELECT *
      FROM public.master_worksheet_session_rules
      WHERE plan_id = active_plan_id
        AND session_number = sess.session_number
        AND is_active = true
      ORDER BY section
    LOOP
      q_start := rule.start_question;
      target_day := public.next_worksheet_weekday(sess.session_date::DATE);

      WHILE q_start <= rule.end_question LOOP
        q_end := LEAST(q_start + rule.daily_target_count - 1, rule.end_question);

        INSERT INTO public.worksheet_daily_targets (
          plan_id, course_id, session_id, master_rule_id, target_date, section,
          question_start, question_end, target_count, range_label, is_active
        )
        VALUES (
          active_plan_id, sess.course_id, sess.id, rule.id, target_day, rule.section,
          q_start, q_end, q_end - q_start + 1, 'Q' || q_start || '-Q' || q_end, true
        )
        ON CONFLICT (course_id, session_id, section, target_date, question_start, question_end)
        DO UPDATE SET
          plan_id = EXCLUDED.plan_id,
          master_rule_id = EXCLUDED.master_rule_id,
          target_count = EXCLUDED.target_count,
          range_label = EXCLUDED.range_label,
          is_active = true;

        generated_count := generated_count + 1;
        q_start := q_end + 1;
        target_day := public.next_worksheet_weekday(target_day + 1);
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN generated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE VIEW public.worksheet_schedule_mismatches AS
WITH expected_sections AS (
  SELECT *
  FROM (VALUES
    (1, NULL::TEXT),
    (2, 'quant'),
    (3, 'verbal'),
    (4, 'quant'),
    (5, 'verbal'),
    (6, 'quant'),
    (7, 'verbal'),
    (8, 'quant'),
    (9, 'verbal'),
    (10, 'quant'),
    (11, 'verbal'),
    (12, 'quant'),
    (13, 'di'),
    (14, 'di'),
    (15, 'di'),
    (16, 'di')
  ) AS expected(session_number, expected_section)
)
SELECT
  'rule_section_mismatch' AS issue,
  rule.session_number,
  rule.section AS actual_section,
  expected.expected_section,
  rule.id AS rule_id,
  NULL::UUID AS target_id
FROM public.master_worksheet_session_rules rule
LEFT JOIN expected_sections expected ON expected.session_number = rule.session_number
WHERE rule.is_active = true
  AND (
    expected.expected_section IS NULL
    OR rule.section <> expected.expected_section
  )
UNION ALL
SELECT
  'target_section_mismatch' AS issue,
  session.session_number,
  target.section AS actual_section,
  expected.expected_section,
  target.master_rule_id AS rule_id,
  target.id AS target_id
FROM public.worksheet_daily_targets target
JOIN public.sessions session ON session.id = target.session_id
LEFT JOIN expected_sections expected ON expected.session_number = session.session_number
WHERE target.is_active = true
  AND (
    expected.expected_section IS NULL
    OR target.section <> expected.expected_section
  );

CREATE OR REPLACE FUNCTION public.sync_universal_worksheet_targets()
RETURNS INTEGER AS $$
DECLARE
  course_record RECORD;
  total_count INTEGER := 0;
BEGIN
  FOR course_record IN SELECT id FROM public.courses WHERE is_active = true LOOP
    total_count := total_count + public.sync_course_worksheet_targets(course_record.id);
  END LOOP;
  RETURN total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_student_worksheet_rank(p_course_id UUID)
RETURNS TABLE (
  user_total INTEGER,
  class_average NUMERIC,
  percentile NUMERIC,
  enrolled_count INTEGER
) AS $$
DECLARE
  current_total INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE course_id = p_course_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not enrolled in this batch';
  END IF;

  SELECT COALESCE(SUM(attempted_count), 0)::INTEGER
  INTO current_total
  FROM public.student_worksheet_logs
  WHERE course_id = p_course_id AND user_id = auth.uid();

  RETURN QUERY
  WITH enrolled AS (
    SELECT user_id FROM public.enrollments WHERE course_id = p_course_id
  ),
  totals AS (
    SELECT e.user_id, COALESCE(SUM(l.attempted_count), 0)::INTEGER AS total
    FROM enrolled e
    LEFT JOIN public.student_worksheet_logs l
      ON l.course_id = p_course_id AND l.user_id = e.user_id
    GROUP BY e.user_id
  )
  SELECT
    current_total,
    COALESCE(AVG(total), 0),
    CASE
      WHEN COUNT(*) <= 1 THEN NULL
      ELSE ROUND((COUNT(*) FILTER (WHERE total <= current_total)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
    END,
    COUNT(*)::INTEGER
  FROM totals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

INSERT INTO public.master_worksheet_plans (title, is_active)
VALUES ('GMAT Daily Worksheet Plan', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.master_worksheet_session_rules (
  plan_id, master_session_id, session_number, section,
  start_question, end_question, daily_target_count, is_active
)
SELECT
  plan.id,
  master_sessions.id,
  master_sessions.session_number,
  CASE
    WHEN master_sessions.session_number IN (13, 14, 15, 16) THEN 'di'
    WHEN master_sessions.session_number IN (3, 5, 7, 9, 11) THEN 'verbal'
    WHEN master_sessions.session_number IN (2, 4, 6, 8, 10, 12) THEN 'quant'
    WHEN LOWER(master_sessions.title) LIKE '%data%' OR LOWER(master_sessions.title) LIKE '%sufficiency%' THEN 'di'
    WHEN LOWER(master_sessions.title) LIKE '%rc%' OR LOWER(master_sessions.title) LIKE '%cr%' THEN 'verbal'
    ELSE 'quant'
  END,
  1,
  50,
  10,
  true
FROM public.master_sessions
CROSS JOIN (
  SELECT id FROM public.master_worksheet_plans
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
) plan
WHERE master_sessions.session_number <> 1
ON CONFLICT (plan_id, master_session_id) DO NOTHING;

SELECT public.sync_universal_worksheet_targets();
