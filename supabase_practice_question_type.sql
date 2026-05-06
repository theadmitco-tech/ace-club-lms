ALTER TABLE public.practice_questions
ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'problem_solving'
CHECK (question_type IN ('problem_solving', 'data_sufficiency', 'reading_comprehension', 'critical_reasoning'));
