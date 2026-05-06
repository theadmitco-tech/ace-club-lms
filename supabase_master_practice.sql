-- Universal worksheet question storage.
-- Run this after the existing master_sessions and native practice tables exist.

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

CREATE INDEX IF NOT EXISTS master_practice_sets_master_session_idx
  ON public.master_practice_sets(master_session_id);
CREATE INDEX IF NOT EXISTS master_practice_questions_set_order_idx
  ON public.master_practice_questions(master_practice_set_id, order_index);
CREATE INDEX IF NOT EXISTS master_practice_attempts_user_session_idx
  ON public.master_practice_attempts(user_id, session_id);
CREATE INDEX IF NOT EXISTS master_practice_attempts_question_idx
  ON public.master_practice_attempts(master_question_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_master_practice_sets_updated_at ON public.master_practice_sets;
CREATE TRIGGER set_master_practice_sets_updated_at
  BEFORE UPDATE ON public.master_practice_sets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_master_practice_questions_updated_at ON public.master_practice_questions;
CREATE TRIGGER set_master_practice_questions_updated_at
  BEFORE UPDATE ON public.master_practice_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.master_practice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_practice_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master practice sets viewable by enrolled users" ON public.master_practice_sets;
DROP POLICY IF EXISTS "Admins can manage master practice sets" ON public.master_practice_sets;
DROP POLICY IF EXISTS "Master practice questions viewable by enrolled users" ON public.master_practice_questions;
DROP POLICY IF EXISTS "Admins can manage master practice questions" ON public.master_practice_questions;
DROP POLICY IF EXISTS "Users can view own master practice attempts" ON public.master_practice_attempts;
DROP POLICY IF EXISTS "Users can insert own master practice attempts" ON public.master_practice_attempts;
DROP POLICY IF EXISTS "Users can update own master practice attempts" ON public.master_practice_attempts;
DROP POLICY IF EXISTS "Admins can manage master practice attempts" ON public.master_practice_attempts;

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

-- Backfill one global question set per master session from the first existing batch/session copy.
INSERT INTO public.master_practice_sets (master_session_id, title)
SELECT ms.id, COALESCE(ps.title, ms.title || ' Worksheet')
FROM public.master_sessions ms
JOIN public.sessions s ON s.session_number = ms.session_number
JOIN public.practice_sets ps ON ps.session_id = s.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_practice_sets existing
  WHERE existing.master_session_id = ms.id
)
AND s.id = (
  SELECT s2.id
  FROM public.sessions s2
  JOIN public.practice_sets ps2 ON ps2.session_id = s2.id
  WHERE s2.session_number = ms.session_number
  ORDER BY s2.created_at ASC
  LIMIT 1
);

INSERT INTO public.master_practice_questions (
  master_practice_set_id,
  question_text,
  options,
  correct_answer,
  explanation,
  difficulty,
  order_index
)
SELECT
  mps.id,
  pq.question_text,
  pq.options,
  pq.correct_answer,
  pq.explanation,
  pq.difficulty,
  pq.order_index
FROM public.master_practice_sets mps
JOIN public.master_sessions ms ON ms.id = mps.master_session_id
JOIN public.sessions s ON s.session_number = ms.session_number
JOIN public.practice_sets ps ON ps.session_id = s.id
JOIN public.practice_questions pq ON pq.practice_set_id = ps.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_practice_questions existing
  WHERE existing.master_practice_set_id = mps.id
    AND existing.order_index = pq.order_index
)
AND s.id = (
  SELECT s2.id
  FROM public.sessions s2
  JOIN public.practice_sets ps2 ON ps2.session_id = s2.id
  WHERE s2.session_number = ms.session_number
  ORDER BY s2.created_at ASC
  LIMIT 1
);

-- Preserve existing attempts by matching old copied questions to master questions by session number and order.
INSERT INTO public.master_practice_attempts (
  course_id,
  session_id,
  user_id,
  master_question_id,
  selected_answer,
  is_correct,
  answered_at
)
SELECT
  s.course_id,
  s.id,
  pa.user_id,
  mpq.id,
  pa.selected_answer,
  pa.is_correct,
  pa.answered_at
FROM public.practice_attempts pa
JOIN public.practice_questions pq ON pq.id = pa.question_id
JOIN public.practice_sets ps ON ps.id = pq.practice_set_id
JOIN public.sessions s ON s.id = ps.session_id
JOIN public.master_sessions ms ON ms.session_number = s.session_number
JOIN public.master_practice_sets mps ON mps.master_session_id = ms.id
JOIN public.master_practice_questions mpq
  ON mpq.master_practice_set_id = mps.id
  AND mpq.order_index = pq.order_index
ON CONFLICT (course_id, session_id, user_id, master_question_id)
DO UPDATE SET
  selected_answer = EXCLUDED.selected_answer,
  is_correct = EXCLUDED.is_correct,
  answered_at = EXCLUDED.answered_at;

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

  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE is_correct)::INTEGER
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
