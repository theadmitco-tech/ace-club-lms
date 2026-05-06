ALTER TABLE public.practice_questions
ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'basic'
CHECK (difficulty IN ('basic', 'advanced'));
