CREATE TABLE IF NOT EXISTS public.student_onboarding_answers (
  student_id        uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal              text        NOT NULL,
  daily_time        text        NOT NULL,
  difficult_subjects text[]     NOT NULL DEFAULT '{}',
  learning_style    text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
