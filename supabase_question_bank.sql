-- GMAT Question Bank migration for Ace Club LMS.
-- Run this in Supabase SQL Editor after the base LMS schema exists.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE,
  import_batch_id UUID,
  section TEXT NOT NULL CHECK (section IN ('Quant', 'Verbal')),
  question_type TEXT NOT NULL CHECK (question_type IN ('QA', 'CR', 'DS')),
  primary_topic TEXT NOT NULL,
  subtopic TEXT NOT NULL DEFAULT '',
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  option_e TEXT,
  correct_option TEXT CHECK (correct_option IN ('A', 'B', 'C', 'D', 'E')),
  correct_value TEXT,
  explanation TEXT NOT NULL DEFAULT '',
  short_explanation TEXT,
  time_estimate_sec INTEGER CHECK (time_estimate_sec IS NULL OR time_estimate_sec > 0),
  concept_tested TEXT,
  common_trap TEXT,
  skill TEXT,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (correct_option IS NOT NULL OR correct_value IS NOT NULL),
  CHECK (correct_option IS DISTINCT FROM 'E' OR option_e IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.question_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE,
  import_batch_id UUID,
  type TEXT NOT NULL CHECK (type IN ('RC', 'DI')),
  di_type TEXT CHECK (di_type IN ('table', 'graph', 'caselet', 'multi_source')),
  section TEXT NOT NULL CHECK (section IN ('Verbal', 'DI')),
  primary_topic TEXT NOT NULL,
  subtopic TEXT NOT NULL DEFAULT '',
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  passage_text TEXT,
  stimulus_data JSONB,
  time_estimate_sec INTEGER CHECK (time_estimate_sec IS NULL OR time_estimate_sec > 0),
  concept_tested TEXT,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((type = 'RC' AND section = 'Verbal' AND di_type IS NULL AND passage_text IS NOT NULL) OR type = 'DI'),
  CHECK ((type = 'DI' AND section = 'DI' AND di_type IS NOT NULL AND stimulus_data IS NOT NULL) OR type = 'RC')
);

CREATE TABLE IF NOT EXISTS public.set_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT,
  import_batch_id UUID,
  set_id UUID REFERENCES public.question_sets(id) ON DELETE CASCADE NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'multi_select', 'numeric', 'dropdown')),
  question_text TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  option_e TEXT,
  correct_option TEXT CHECK (correct_option IN ('A', 'B', 'C', 'D', 'E')),
  correct_options TEXT[],
  correct_value TEXT,
  explanation TEXT NOT NULL DEFAULT '',
  short_explanation TEXT,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  time_estimate_sec INTEGER CHECK (time_estimate_sec IS NULL OR time_estimate_sec > 0),
  concept_tested TEXT,
  common_trap TEXT,
  skill TEXT,
  tags TEXT[],
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (set_id, external_id),
  CHECK (correct_option IS DISTINCT FROM 'E' OR option_e IS NOT NULL),
  CHECK (
    (question_type IN ('mcq', 'dropdown') AND correct_option IS NOT NULL AND correct_options IS NULL AND correct_value IS NULL)
    OR (question_type = 'multi_select' AND correct_option IS NULL AND correct_options IS NOT NULL AND array_length(correct_options, 1) > 0 AND correct_value IS NULL)
    OR (question_type = 'numeric' AND correct_option IS NULL AND correct_options IS NULL AND correct_value IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS questions_section_primary_topic_idx ON public.questions (section, primary_topic);
CREATE INDEX IF NOT EXISTS questions_question_type_idx ON public.questions (question_type);
CREATE INDEX IF NOT EXISTS questions_difficulty_idx ON public.questions (difficulty);
CREATE INDEX IF NOT EXISTS questions_active_display_idx ON public.questions (is_active, display_order);
CREATE INDEX IF NOT EXISTS questions_topic_route_idx ON public.questions (section, question_type, primary_topic, subtopic) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS question_sets_type_primary_topic_idx ON public.question_sets (type, primary_topic);
CREATE INDEX IF NOT EXISTS question_sets_di_type_idx ON public.question_sets (di_type);
CREATE INDEX IF NOT EXISTS question_sets_active_display_idx ON public.question_sets (is_active, display_order);
CREATE INDEX IF NOT EXISTS question_sets_route_idx ON public.question_sets (type, di_type, primary_topic, subtopic) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS set_questions_set_id_idx ON public.set_questions (set_id);
CREATE INDEX IF NOT EXISTS set_questions_difficulty_idx ON public.set_questions (difficulty);
CREATE INDEX IF NOT EXISTS set_questions_active_display_idx ON public.set_questions (set_id, is_active, display_order);

DROP TRIGGER IF EXISTS set_questions_updated_at ON public.questions;
CREATE TRIGGER set_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS set_question_sets_updated_at ON public.question_sets;
CREATE TRIGGER set_question_sets_updated_at
  BEFORE UPDATE ON public.question_sets
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS set_set_questions_updated_at ON public.set_questions;
CREATE TRIGGER set_set_questions_updated_at
  BEFORE UPDATE ON public.set_questions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active standalone questions viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage standalone questions" ON public.questions;
DROP POLICY IF EXISTS "Active question sets viewable by everyone" ON public.question_sets;
DROP POLICY IF EXISTS "Admins can manage question sets" ON public.question_sets;
DROP POLICY IF EXISTS "Active set questions viewable by everyone" ON public.set_questions;
DROP POLICY IF EXISTS "Admins can manage set questions" ON public.set_questions;

CREATE POLICY "Active standalone questions viewable by everyone"
  ON public.questions FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage standalone questions"
  ON public.questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Active question sets viewable by everyone"
  ON public.question_sets FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage question sets"
  ON public.question_sets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Active set questions viewable by everyone"
  ON public.set_questions FOR SELECT
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.question_sets WHERE id = set_id AND is_active = true)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage set questions"
  ON public.set_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
