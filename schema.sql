-- ACE CLUB LMS: Supabase Schema

-- 1. Profiles Table (Extends Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Courses (Batches) Table
CREATE TABLE public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Sessions Table
CREATE TABLE public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  session_date TIMESTAMPTZ NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Materials Table
CREATE TABLE public.materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pre_read', 'class_material', 'worksheet', 'video')),
  title TEXT NOT NULL,
  file_url TEXT,
  notion_url TEXT,
  video_url TEXT,
  available_from TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Native Practice / Q&A Tables
CREATE TABLE public.practice_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.practice_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_set_id UUID REFERENCES public.practice_sets(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'basic' CHECK (difficulty IN ('basic', 'advanced')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.practice_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.practice_questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 6. Enrollments Table
CREATE TABLE public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read profiles (useful for admin dashboard), but only owner can update
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Courses: Everyone can view active courses, admins can do all
CREATE POLICY "Courses viewable by everyone" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sessions: Everyone can view, admins can edit
CREATE POLICY "Sessions viewable by everyone" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Admins can manage sessions" ON public.sessions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Materials: Everyone can view, admins can edit
CREATE POLICY "Materials viewable by everyone" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Admins can manage materials" ON public.materials FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Practice: Students can read questions, users manage their attempts, admins manage content
CREATE POLICY "Practice sets viewable by everyone" ON public.practice_sets FOR SELECT USING (true);
CREATE POLICY "Practice questions viewable by everyone" ON public.practice_questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage practice sets" ON public.practice_sets
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage practice questions" ON public.practice_questions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can view own practice attempts" ON public.practice_attempts FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can insert own practice attempts" ON public.practice_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own practice attempts" ON public.practice_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage practice attempts" ON public.practice_attempts FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Enrollments: Users can view their own, admins can manage all
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger to automatically create a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'student');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Master Curriculum (Templates)
CREATE TABLE public.master_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.master_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_session_id UUID REFERENCES public.master_sessions(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pre_read', 'class_material', 'worksheet', 'video')),
  title TEXT NOT NULL,
  notion_url TEXT,
  file_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.master_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage master sessions" ON public.master_sessions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage master materials" ON public.master_materials FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Master sessions viewable by everyone" ON public.master_sessions FOR SELECT USING (true);
CREATE POLICY "Master materials viewable by everyone" ON public.master_materials FOR SELECT USING (true);

-- 8. Universal Worksheet Progress Tracker
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
          plan_id,
          course_id,
          session_id,
          master_rule_id,
          target_date,
          section,
          question_start,
          question_end,
          target_count,
          range_label,
          is_active
        )
        VALUES (
          active_plan_id,
          sess.course_id,
          sess.id,
          rule.id,
          target_day,
          rule.section,
          q_start,
          q_end,
          q_end - q_start + 1,
          'Q' || q_start || '-Q' || q_end,
          true
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
    SELECT
      e.user_id,
      COALESCE(SUM(l.attempted_count), 0)::INTEGER AS total
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
  plan_id,
  master_session_id,
  session_number,
  section,
  start_question,
  end_question,
  daily_target_count,
  is_active
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
  SELECT id
  FROM public.master_worksheet_plans
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
) plan
WHERE master_sessions.session_number <> 1
ON CONFLICT (plan_id, master_session_id) DO NOTHING;

SELECT public.sync_universal_worksheet_targets();

-- 9. Universal Worksheet Questions
CREATE TABLE IF NOT EXISTS public.master_practice_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_session_id UUID REFERENCES public.master_sessions(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(master_session_id)
);

CREATE TABLE IF NOT EXISTS public.master_practice_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_practice_set_id UUID REFERENCES public.master_practice_sets(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'basic' CHECK (difficulty IN ('basic', 'advanced')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(master_practice_set_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.master_practice_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  master_question_id UUID REFERENCES public.master_practice_questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, session_id, user_id, master_question_id)
);

CREATE INDEX IF NOT EXISTS master_practice_sets_master_session_idx ON public.master_practice_sets(master_session_id);
CREATE INDEX IF NOT EXISTS master_practice_questions_set_order_idx ON public.master_practice_questions(master_practice_set_id, order_index);
CREATE INDEX IF NOT EXISTS master_practice_attempts_user_session_idx ON public.master_practice_attempts(user_id, session_id);
CREATE INDEX IF NOT EXISTS master_practice_attempts_question_idx ON public.master_practice_attempts(master_question_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_master_practice_sets_updated_at
  BEFORE UPDATE ON public.master_practice_sets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_master_practice_questions_updated_at
  BEFORE UPDATE ON public.master_practice_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.master_practice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_practice_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master practice sets viewable by enrolled users" ON public.master_practice_sets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can manage master practice sets" ON public.master_practice_sets
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Master practice questions viewable by enrolled users" ON public.master_practice_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can manage master practice questions" ON public.master_practice_questions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view own master practice attempts" ON public.master_practice_attempts
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Users can insert own master practice attempts" ON public.master_practice_attempts
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = master_practice_attempts.course_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update own master practice attempts" ON public.master_practice_attempts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = master_practice_attempts.course_id AND user_id = auth.uid())
  );
CREATE POLICY "Admins can manage master practice attempts" ON public.master_practice_attempts
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.get_student_worksheet_attempt_rank(p_course_id UUID)
RETURNS TABLE (
  user_total INTEGER,
  user_correct INTEGER,
  user_accuracy NUMERIC,
  class_average NUMERIC,
  class_accuracy NUMERIC,
  percentile NUMERIC,
  enrolled_count INTEGER,
  active_today INTEGER
) AS $$
DECLARE
  current_total INTEGER;
  current_correct INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE course_id = p_course_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not enrolled in this batch';
  END IF;

  SELECT COUNT(*)::INTEGER, COUNT(*) FILTER (WHERE is_correct)::INTEGER
  INTO current_total, current_correct
  FROM public.master_practice_attempts
  WHERE course_id = p_course_id AND user_id = auth.uid();

  RETURN QUERY
  WITH enrolled AS (
    SELECT user_id FROM public.enrollments WHERE course_id = p_course_id
  ),
  totals AS (
    SELECT
      e.user_id,
      COUNT(a.id)::INTEGER AS attempted,
      COUNT(a.id) FILTER (WHERE a.is_correct)::INTEGER AS correct,
      COUNT(a.id) FILTER (WHERE a.answered_at::DATE = CURRENT_DATE)::INTEGER AS today_attempts
    FROM enrolled e
    LEFT JOIN public.master_practice_attempts a
      ON a.course_id = p_course_id AND a.user_id = e.user_id
    GROUP BY e.user_id
  )
  SELECT
    COALESCE(current_total, 0),
    COALESCE(current_correct, 0),
    CASE WHEN COALESCE(current_total, 0) = 0 THEN 0 ELSE ROUND((current_correct::NUMERIC / current_total::NUMERIC) * 100, 1) END,
    COALESCE(AVG(attempted), 0),
    CASE WHEN COALESCE(SUM(attempted), 0) = 0 THEN 0 ELSE ROUND((SUM(correct)::NUMERIC / SUM(attempted)::NUMERIC) * 100, 1) END,
    CASE
      WHEN COUNT(*) <= 1 THEN NULL
      ELSE ROUND((COUNT(*) FILTER (WHERE attempted <= COALESCE(current_total, 0))::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
    END,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE today_attempts > 0)::INTEGER
  FROM totals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_student_worksheet_target_attempts(p_course_id UUID)
RETURNS TABLE (
  target_id UUID,
  attempted_count INTEGER,
  correct_count INTEGER
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE course_id = p_course_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not enrolled in this batch';
  END IF;

  RETURN QUERY
  SELECT
    target.id,
    COUNT(question.id)::INTEGER AS attempted_count,
    COUNT(question.id) FILTER (WHERE attempt.is_correct)::INTEGER AS correct_count
  FROM public.worksheet_daily_targets target
  LEFT JOIN public.master_practice_attempts attempt
    ON attempt.course_id = target.course_id
    AND attempt.session_id = target.session_id
    AND attempt.user_id = auth.uid()
  LEFT JOIN public.master_practice_questions question
    ON question.id = attempt.master_question_id
    AND question.order_index BETWEEN target.question_start AND target.question_end
  WHERE target.course_id = p_course_id
    AND target.is_active = true
  GROUP BY target.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_course_worksheet_attempt_stats(p_course_id UUID)
RETURNS TABLE (
  user_id UUID,
  attempted_total INTEGER,
  correct_total INTEGER,
  accuracy NUMERIC,
  last_attempt_date DATE,
  active_today BOOLEAN
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    enrollment.user_id,
    COUNT(attempt.id)::INTEGER AS attempted_total,
    COUNT(attempt.id) FILTER (WHERE attempt.is_correct)::INTEGER AS correct_total,
    CASE WHEN COUNT(attempt.id) = 0 THEN 0 ELSE ROUND((COUNT(attempt.id) FILTER (WHERE attempt.is_correct)::NUMERIC / COUNT(attempt.id)::NUMERIC) * 100, 1) END AS accuracy,
    MAX(attempt.answered_at::DATE) AS last_attempt_date,
    COUNT(attempt.id) FILTER (WHERE attempt.answered_at::DATE = CURRENT_DATE) > 0 AS active_today
  FROM public.enrollments enrollment
  LEFT JOIN public.master_practice_attempts attempt
    ON attempt.course_id = p_course_id AND attempt.user_id = enrollment.user_id
  WHERE enrollment.course_id = p_course_id
  GROUP BY enrollment.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
