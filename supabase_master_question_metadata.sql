-- Upgrade universal session questions with richer GMAT rendering metadata.
-- Run this once in Supabase SQL Editor. Existing questions are preserved.

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'problem_solving'
CHECK (
  question_type IN (
    'problem_solving',
    'data_sufficiency',
    'critical_reasoning',
    'reading_comprehension',
    'data_insights'
  )
);

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS di_question_type TEXT
CHECK (
  di_question_type IS NULL OR di_question_type IN (
    'data_sufficiency',
    'multi_source_reasoning',
    'table_analysis',
    'graphics_interpretation',
    'two_part_analysis'
  )
);

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'single_choice'
CHECK (answer_mode IN ('single_choice', 'multi_select', 'numeric', 'two_part', 'dropdown'));

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS stimulus_group_key TEXT;

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS stimulus_title TEXT;

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS stimulus_text TEXT;

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS stimulus_data JSONB;

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS content_format TEXT NOT NULL DEFAULT 'plain'
CHECK (content_format IN ('plain', 'markdown'));

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS master_practice_questions_type_idx
  ON public.master_practice_questions(question_type, di_question_type);

CREATE INDEX IF NOT EXISTS master_practice_questions_stimulus_group_idx
  ON public.master_practice_questions(master_practice_set_id, stimulus_group_key)
  WHERE stimulus_group_key IS NOT NULL;

UPDATE public.master_practice_questions
SET question_type = CASE
  WHEN LOWER(COALESCE(question_type, '')) IN ('critical_reasoning', 'cr') THEN 'critical_reasoning'
  WHEN LOWER(COALESCE(question_type, '')) IN ('reading_comprehension', 'rc') THEN 'reading_comprehension'
  WHEN LOWER(COALESCE(question_text, '')) LIKE '%(1)%' AND LOWER(COALESCE(question_text, '')) LIKE '%(2)%' THEN 'data_sufficiency'
  ELSE COALESCE(NULLIF(question_type, ''), 'problem_solving')
END
WHERE question_type IS NULL OR question_type = 'problem_solving';
