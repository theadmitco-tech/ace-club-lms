-- Ace Club LMS production-schema baseline
-- Generated from the read-only production inventories captured on 31 July 2026.
-- Intended for the empty staging project only. It does not copy production row data.

begin;

create schema if not exists public;

create table if not exists public."courses" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "description" text,
  "is_active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "registration_open" boolean default false not null,
  "capacity" integer default 8 not null,
  "price_amount" integer default 0 not null,
  "currency" text default 'INR'::text not null,
  "registration_closes_at" timestamp with time zone,
  "public_note" text
);

create table if not exists public."enrollments" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "course_id" uuid not null,
  "enrolled_at" timestamp with time zone default now() not null
);

create table if not exists public."master_materials" (
  "id" uuid default gen_random_uuid() not null,
  "master_session_id" uuid not null,
  "type" text not null,
  "title" text not null,
  "notion_url" text,
  "file_url" text,
  "video_url" text,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists public."master_practice_attempts" (
  "id" uuid default gen_random_uuid() not null,
  "course_id" uuid not null,
  "session_id" uuid not null,
  "user_id" uuid not null,
  "master_question_id" uuid not null,
  "selected_answer" text not null,
  "is_correct" boolean not null,
  "answered_at" timestamp with time zone default now() not null
);

create table if not exists public."master_practice_questions" (
  "id" uuid default gen_random_uuid() not null,
  "master_practice_set_id" uuid not null,
  "question_text" text not null,
  "options" jsonb default '[]'::jsonb not null,
  "correct_answer" text not null,
  "explanation" text default ''::text not null,
  "difficulty" text default 'basic'::text not null,
  "order_index" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."master_practice_sets" (
  "id" uuid default gen_random_uuid() not null,
  "master_session_id" uuid not null,
  "title" text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."master_sessions" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "session_number" integer not null,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists public."master_worksheet_plans" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "is_active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."master_worksheet_session_rules" (
  "id" uuid default gen_random_uuid() not null,
  "plan_id" uuid not null,
  "master_session_id" uuid not null,
  "session_number" integer not null,
  "section" text not null,
  "start_question" integer default 1 not null,
  "end_question" integer default 50 not null,
  "daily_target_count" integer default 10 not null,
  "is_active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists public."materials" (
  "id" uuid default gen_random_uuid() not null,
  "session_id" uuid not null,
  "type" text not null,
  "title" text not null,
  "file_url" text,
  "notion_url" text,
  "video_url" text,
  "available_from" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists public."payments" (
  "id" uuid default gen_random_uuid() not null,
  "registration_id" uuid not null,
  "razorpay_order_id" text,
  "razorpay_payment_id" text,
  "razorpay_signature" text,
  "amount" integer not null,
  "currency" text default 'INR'::text not null,
  "status" text default 'created'::text not null,
  "raw_payload" jsonb,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."practice_attempts" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "question_id" uuid not null,
  "selected_answer" text not null,
  "is_correct" boolean not null,
  "answered_at" timestamp with time zone default now() not null
);

create table if not exists public."practice_questions" (
  "id" uuid default gen_random_uuid() not null,
  "practice_set_id" uuid not null,
  "question_text" text not null,
  "options" jsonb not null,
  "correct_answer" text not null,
  "explanation" text default ''::text not null,
  "difficulty" text default 'basic'::text not null,
  "order_index" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists public."practice_sets" (
  "id" uuid default gen_random_uuid() not null,
  "session_id" uuid not null,
  "title" text not null,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists public."profiles" (
  "id" uuid not null,
  "email" text not null,
  "full_name" text not null,
  "role" text default 'student'::text not null,
  "avatar_url" text,
  "created_at" timestamp with time zone default now() not null,
  "is_active" boolean default true not null,
  "invited_at" timestamp with time zone,
  "activated_at" timestamp with time zone
);

create table if not exists public."registrations" (
  "id" uuid default gen_random_uuid() not null,
  "course_id" uuid not null,
  "full_name" text not null,
  "email" text not null,
  "phone" text not null,
  "target_gmat_date" date,
  "consent" boolean default false not null,
  "status" text default 'pending_payment'::text not null,
  "reserved_until" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."sessions" (
  "id" uuid default gen_random_uuid() not null,
  "course_id" uuid not null,
  "title" text not null,
  "session_number" integer not null,
  "session_date" timestamp with time zone not null,
  "is_published" boolean default false not null,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists public."student_worksheet_logs" (
  "id" uuid default gen_random_uuid() not null,
  "target_id" uuid not null,
  "course_id" uuid not null,
  "user_id" uuid not null,
  "log_date" date not null,
  "section" text not null,
  "attempted_count" integer default 0 not null,
  "attempted_range" text,
  "note" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."worksheet_daily_targets" (
  "id" uuid default gen_random_uuid() not null,
  "plan_id" uuid not null,
  "course_id" uuid not null,
  "session_id" uuid not null,
  "master_rule_id" uuid,
  "target_date" date not null,
  "section" text not null,
  "question_start" integer not null,
  "question_end" integer not null,
  "target_count" integer not null,
  "range_label" text not null,
  "is_active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null
);

-- Primary, unique, check, and foreign-key constraints.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'courses_capacity_check' and conrelid = 'public.courses'::regclass) then
    alter table public."courses" add constraint "courses_capacity_check" CHECK (capacity > 0);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'courses_pkey' and conrelid = 'public.courses'::regclass) then
    alter table public."courses" add constraint "courses_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'courses_price_amount_check' and conrelid = 'public.courses'::regclass) then
    alter table public."courses" add constraint "courses_price_amount_check" CHECK (price_amount >= 0);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'enrollments_pkey' and conrelid = 'public.enrollments'::regclass) then
    alter table public."enrollments" add constraint "enrollments_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'enrollments_user_id_course_id_key' and conrelid = 'public.enrollments'::regclass) then
    alter table public."enrollments" add constraint "enrollments_user_id_course_id_key" UNIQUE (user_id, course_id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_materials_pkey' and conrelid = 'public.master_materials'::regclass) then
    alter table public."master_materials" add constraint "master_materials_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_materials_type_check' and conrelid = 'public.master_materials'::regclass) then
    alter table public."master_materials" add constraint "master_materials_type_check" CHECK (type = ANY (ARRAY['pre_read'::text, 'class_material'::text, 'worksheet'::text, 'video'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_attempts_course_id_session_id_user_id_maste_key' and conrelid = 'public.master_practice_attempts'::regclass) then
    alter table public."master_practice_attempts" add constraint "master_practice_attempts_course_id_session_id_user_id_maste_key" UNIQUE (course_id, session_id, user_id, master_question_id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_attempts_pkey' and conrelid = 'public.master_practice_attempts'::regclass) then
    alter table public."master_practice_attempts" add constraint "master_practice_attempts_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_questions_difficulty_check' and conrelid = 'public.master_practice_questions'::regclass) then
    alter table public."master_practice_questions" add constraint "master_practice_questions_difficulty_check" CHECK (difficulty = ANY (ARRAY['basic'::text, 'advanced'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_questions_master_practice_set_id_order_inde_key' and conrelid = 'public.master_practice_questions'::regclass) then
    alter table public."master_practice_questions" add constraint "master_practice_questions_master_practice_set_id_order_inde_key" UNIQUE (master_practice_set_id, order_index);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_questions_pkey' and conrelid = 'public.master_practice_questions'::regclass) then
    alter table public."master_practice_questions" add constraint "master_practice_questions_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_sets_master_session_id_key' and conrelid = 'public.master_practice_sets'::regclass) then
    alter table public."master_practice_sets" add constraint "master_practice_sets_master_session_id_key" UNIQUE (master_session_id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_sets_pkey' and conrelid = 'public.master_practice_sets'::regclass) then
    alter table public."master_practice_sets" add constraint "master_practice_sets_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_sessions_pkey' and conrelid = 'public.master_sessions'::regclass) then
    alter table public."master_sessions" add constraint "master_sessions_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_worksheet_plans_pkey' and conrelid = 'public.master_worksheet_plans'::regclass) then
    alter table public."master_worksheet_plans" add constraint "master_worksheet_plans_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_worksheet_session_rules_check' and conrelid = 'public.master_worksheet_session_rules'::regclass) then
    alter table public."master_worksheet_session_rules" add constraint "master_worksheet_session_rules_check" CHECK (end_question >= start_question);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_worksheet_session_rules_daily_target_count_check' and conrelid = 'public.master_worksheet_session_rules'::regclass) then
    alter table public."master_worksheet_session_rules" add constraint "master_worksheet_session_rules_daily_target_count_check" CHECK (daily_target_count > 0);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_worksheet_session_rules_pkey' and conrelid = 'public.master_worksheet_session_rules'::regclass) then
    alter table public."master_worksheet_session_rules" add constraint "master_worksheet_session_rules_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_worksheet_session_rules_plan_id_master_session_id_key' and conrelid = 'public.master_worksheet_session_rules'::regclass) then
    alter table public."master_worksheet_session_rules" add constraint "master_worksheet_session_rules_plan_id_master_session_id_key" UNIQUE (plan_id, master_session_id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_worksheet_session_rules_section_check' and conrelid = 'public.master_worksheet_session_rules'::regclass) then
    alter table public."master_worksheet_session_rules" add constraint "master_worksheet_session_rules_section_check" CHECK (section = ANY (ARRAY['quant'::text, 'verbal'::text, 'di'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_worksheet_session_rules_start_question_check' and conrelid = 'public.master_worksheet_session_rules'::regclass) then
    alter table public."master_worksheet_session_rules" add constraint "master_worksheet_session_rules_start_question_check" CHECK (start_question > 0);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'materials_pkey' and conrelid = 'public.materials'::regclass) then
    alter table public."materials" add constraint "materials_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'materials_type_check' and conrelid = 'public.materials'::regclass) then
    alter table public."materials" add constraint "materials_type_check" CHECK (type = ANY (ARRAY['pre_read'::text, 'class_material'::text, 'worksheet'::text, 'video'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_amount_check' and conrelid = 'public.payments'::regclass) then
    alter table public."payments" add constraint "payments_amount_check" CHECK (amount >= 0);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_pkey' and conrelid = 'public.payments'::regclass) then
    alter table public."payments" add constraint "payments_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_razorpay_order_id_key' and conrelid = 'public.payments'::regclass) then
    alter table public."payments" add constraint "payments_razorpay_order_id_key" UNIQUE (razorpay_order_id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_razorpay_payment_id_key' and conrelid = 'public.payments'::regclass) then
    alter table public."payments" add constraint "payments_razorpay_payment_id_key" UNIQUE (razorpay_payment_id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_status_check' and conrelid = 'public.payments'::regclass) then
    alter table public."payments" add constraint "payments_status_check" CHECK (status = ANY (ARRAY['created'::text, 'paid'::text, 'failed'::text, 'refunded'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_attempts_pkey' and conrelid = 'public.practice_attempts'::regclass) then
    alter table public."practice_attempts" add constraint "practice_attempts_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_attempts_user_id_question_id_key' and conrelid = 'public.practice_attempts'::regclass) then
    alter table public."practice_attempts" add constraint "practice_attempts_user_id_question_id_key" UNIQUE (user_id, question_id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_questions_difficulty_check' and conrelid = 'public.practice_questions'::regclass) then
    alter table public."practice_questions" add constraint "practice_questions_difficulty_check" CHECK (difficulty = ANY (ARRAY['basic'::text, 'advanced'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_questions_pkey' and conrelid = 'public.practice_questions'::regclass) then
    alter table public."practice_questions" add constraint "practice_questions_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_sets_pkey' and conrelid = 'public.practice_sets'::regclass) then
    alter table public."practice_sets" add constraint "practice_sets_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_email_key' and conrelid = 'public.profiles'::regclass) then
    alter table public."profiles" add constraint "profiles_email_key" UNIQUE (email);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_pkey' and conrelid = 'public.profiles'::regclass) then
    alter table public."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass) then
    alter table public."profiles" add constraint "profiles_role_check" CHECK (role = ANY (ARRAY['student'::text, 'admin'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'registrations_pkey' and conrelid = 'public.registrations'::regclass) then
    alter table public."registrations" add constraint "registrations_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'registrations_status_check' and conrelid = 'public.registrations'::regclass) then
    alter table public."registrations" add constraint "registrations_status_check" CHECK (status = ANY (ARRAY['pending_payment'::text, 'paid'::text, 'failed'::text, 'expired'::text, 'cancelled'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_pkey' and conrelid = 'public.sessions'::regclass) then
    alter table public."sessions" add constraint "sessions_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_worksheet_logs_attempted_count_check' and conrelid = 'public.student_worksheet_logs'::regclass) then
    alter table public."student_worksheet_logs" add constraint "student_worksheet_logs_attempted_count_check" CHECK (attempted_count >= 0);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_worksheet_logs_pkey' and conrelid = 'public.student_worksheet_logs'::regclass) then
    alter table public."student_worksheet_logs" add constraint "student_worksheet_logs_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_worksheet_logs_section_check' and conrelid = 'public.student_worksheet_logs'::regclass) then
    alter table public."student_worksheet_logs" add constraint "student_worksheet_logs_section_check" CHECK (section = ANY (ARRAY['quant'::text, 'verbal'::text, 'di'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_worksheet_logs_target_id_user_id_key' and conrelid = 'public.student_worksheet_logs'::regclass) then
    alter table public."student_worksheet_logs" add constraint "student_worksheet_logs_target_id_user_id_key" UNIQUE (target_id, user_id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_check' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_check" CHECK (question_end >= question_start);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_course_id_session_id_section_target_key' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_course_id_session_id_section_target_key" UNIQUE (course_id, session_id, section, target_date, question_start, question_end);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_pkey' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_pkey" PRIMARY KEY (id);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_question_start_check' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_question_start_check" CHECK (question_start > 0);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_section_check' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_section_check" CHECK (section = ANY (ARRAY['quant'::text, 'verbal'::text, 'di'::text]));
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_target_count_check' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_target_count_check" CHECK (target_count > 0);
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'enrollments_course_id_fkey' and conrelid = 'public.enrollments'::regclass) then
    alter table public."enrollments" add constraint "enrollments_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'enrollments_user_id_fkey' and conrelid = 'public.enrollments'::regclass) then
    alter table public."enrollments" add constraint "enrollments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_materials_master_session_id_fkey' and conrelid = 'public.master_materials'::regclass) then
    alter table public."master_materials" add constraint "master_materials_master_session_id_fkey" FOREIGN KEY (master_session_id) REFERENCES public.master_sessions(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_attempts_course_id_fkey' and conrelid = 'public.master_practice_attempts'::regclass) then
    alter table public."master_practice_attempts" add constraint "master_practice_attempts_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_attempts_master_question_id_fkey' and conrelid = 'public.master_practice_attempts'::regclass) then
    alter table public."master_practice_attempts" add constraint "master_practice_attempts_master_question_id_fkey" FOREIGN KEY (master_question_id) REFERENCES public.master_practice_questions(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_attempts_session_id_fkey' and conrelid = 'public.master_practice_attempts'::regclass) then
    alter table public."master_practice_attempts" add constraint "master_practice_attempts_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_attempts_user_id_fkey' and conrelid = 'public.master_practice_attempts'::regclass) then
    alter table public."master_practice_attempts" add constraint "master_practice_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_questions_master_practice_set_id_fkey' and conrelid = 'public.master_practice_questions'::regclass) then
    alter table public."master_practice_questions" add constraint "master_practice_questions_master_practice_set_id_fkey" FOREIGN KEY (master_practice_set_id) REFERENCES public.master_practice_sets(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_practice_sets_master_session_id_fkey' and conrelid = 'public.master_practice_sets'::regclass) then
    alter table public."master_practice_sets" add constraint "master_practice_sets_master_session_id_fkey" FOREIGN KEY (master_session_id) REFERENCES public.master_sessions(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_worksheet_session_rules_master_session_id_fkey' and conrelid = 'public.master_worksheet_session_rules'::regclass) then
    alter table public."master_worksheet_session_rules" add constraint "master_worksheet_session_rules_master_session_id_fkey" FOREIGN KEY (master_session_id) REFERENCES public.master_sessions(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'master_worksheet_session_rules_plan_id_fkey' and conrelid = 'public.master_worksheet_session_rules'::regclass) then
    alter table public."master_worksheet_session_rules" add constraint "master_worksheet_session_rules_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.master_worksheet_plans(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'materials_session_id_fkey' and conrelid = 'public.materials'::regclass) then
    alter table public."materials" add constraint "materials_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_registration_id_fkey' and conrelid = 'public.payments'::regclass) then
    alter table public."payments" add constraint "payments_registration_id_fkey" FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_attempts_question_id_fkey' and conrelid = 'public.practice_attempts'::regclass) then
    alter table public."practice_attempts" add constraint "practice_attempts_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.practice_questions(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_attempts_user_id_fkey' and conrelid = 'public.practice_attempts'::regclass) then
    alter table public."practice_attempts" add constraint "practice_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_questions_practice_set_id_fkey' and conrelid = 'public.practice_questions'::regclass) then
    alter table public."practice_questions" add constraint "practice_questions_practice_set_id_fkey" FOREIGN KEY (practice_set_id) REFERENCES public.practice_sets(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_sets_session_id_fkey' and conrelid = 'public.practice_sets'::regclass) then
    alter table public."practice_sets" add constraint "practice_sets_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_id_fkey' and conrelid = 'public.profiles'::regclass) then
    alter table public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'registrations_course_id_fkey' and conrelid = 'public.registrations'::regclass) then
    alter table public."registrations" add constraint "registrations_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_course_id_fkey' and conrelid = 'public.sessions'::regclass) then
    alter table public."sessions" add constraint "sessions_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_worksheet_logs_course_id_fkey' and conrelid = 'public.student_worksheet_logs'::regclass) then
    alter table public."student_worksheet_logs" add constraint "student_worksheet_logs_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_worksheet_logs_target_id_fkey' and conrelid = 'public.student_worksheet_logs'::regclass) then
    alter table public."student_worksheet_logs" add constraint "student_worksheet_logs_target_id_fkey" FOREIGN KEY (target_id) REFERENCES public.worksheet_daily_targets(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_worksheet_logs_user_id_fkey' and conrelid = 'public.student_worksheet_logs'::regclass) then
    alter table public."student_worksheet_logs" add constraint "student_worksheet_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_course_id_fkey' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_master_rule_id_fkey' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_master_rule_id_fkey" FOREIGN KEY (master_rule_id) REFERENCES public.master_worksheet_session_rules(id) ON DELETE SET NULL;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_plan_id_fkey' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.master_worksheet_plans(id) ON DELETE CASCADE;
  end if;
end
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'worksheet_daily_targets_session_id_fkey' and conrelid = 'public.worksheet_daily_targets'::regclass) then
    alter table public."worksheet_daily_targets" add constraint "worksheet_daily_targets_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
  end if;
end
$$;
-- Non-constraint indexes.
CREATE INDEX IF NOT EXISTS master_practice_attempts_question_idx ON public.master_practice_attempts USING btree (master_question_id);
CREATE INDEX IF NOT EXISTS master_practice_attempts_user_session_idx ON public.master_practice_attempts USING btree (user_id, session_id);
CREATE INDEX IF NOT EXISTS master_practice_questions_set_order_idx ON public.master_practice_questions USING btree (master_practice_set_id, order_index);
CREATE INDEX IF NOT EXISTS master_practice_sets_master_session_idx ON public.master_practice_sets USING btree (master_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS master_worksheet_plans_one_active ON public.master_worksheet_plans USING btree (is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS payments_order_idx ON public.payments USING btree (razorpay_order_id);
CREATE INDEX IF NOT EXISTS payments_registration_idx ON public.payments USING btree (registration_id);
CREATE INDEX IF NOT EXISTS registrations_course_status_idx ON public.registrations USING btree (course_id, status);
CREATE INDEX IF NOT EXISTS registrations_email_idx ON public.registrations USING btree (lower(email));
CREATE INDEX IF NOT EXISTS registrations_reserved_until_idx ON public.registrations USING btree (reserved_until);

-- Production function definitions.
CREATE OR REPLACE FUNCTION public.can_access_course(p_course_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                    SELECT EXISTS (
                                        SELECT 1
                                            FROM public.profiles profile
                                                WHERE profile.id = auth.uid()
                                                      AND profile.is_active = true
                                                            AND (
                                                                    profile.role = 'admin'
                                                                            OR EXISTS (
                                                                                      SELECT 1 FROM public.enrollments enrollment
                                                                                                WHERE enrollment.user_id = auth.uid()
                                                                                                            AND enrollment.course_id = p_course_id
                                                                                                                    )
                                                                                                                          )
                                                                                                                            );
                                                                                                                            $function$;

CREATE OR REPLACE FUNCTION public.get_course_worksheet_attempt_stats(p_course_id uuid)
 RETURNS TABLE(user_id uuid, attempted_total integer, correct_total integer, accuracy numeric, last_attempt_date date, active_today boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_student_worksheet_attempt_rank(p_course_id uuid)
 RETURNS TABLE(user_total integer, user_correct integer, user_accuracy numeric, class_average numeric, class_accuracy numeric, percentile numeric, enrolled_count integer, active_today integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_student_worksheet_rank(p_course_id uuid)
 RETURNS TABLE(user_total integer, class_average numeric, percentile numeric, enrolled_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_student_worksheet_target_attempts(p_course_id uuid)
 RETURNS TABLE(target_id uuid, attempted_count integer, correct_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                            BEGIN
                                                                                                                              INSERT INTO public.profiles (id, email, full_name, role, is_active, invited_at)
                                                                                                                                VALUES (
                                                                                                                                    new.id,
                                                                                                                                        new.email,
                                                                                                                                            COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
                                                                                                                                                CASE WHEN new.raw_user_meta_data->>'role' = 'admin' THEN 'admin' ELSE 'student' END,
                                                                                                                                                    true,
                                                                                                                                                        NOW()
                                                                                                                                                          )
                                                                                                                                                            ON CONFLICT (id) DO NOTHING;
                                                                                                                                                              RETURN new;
                                                                                                                                                              END;
                                                                                                                                                              $function$;

CREATE OR REPLACE FUNCTION public.is_active_portal_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
            SELECT EXISTS (
                SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND is_active = true
                      );
                      $function$;

CREATE OR REPLACE FUNCTION public.is_portal_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                        SELECT EXISTS (
                            SELECT 1 FROM public.profiles
                                WHERE id = auth.uid() AND role = 'admin' AND is_active = true
                                  );
                                  $function$;

CREATE OR REPLACE FUNCTION public.mark_own_account_active()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                UPDATE public.profiles
                                                                                                                                                                  SET activated_at = COALESCE(activated_at, NOW())
                                                                                                                                                                    WHERE id = auth.uid() AND is_active = true;
                                                                                                                                                                    $function$;

CREATE OR REPLACE FUNCTION public.next_worksheet_weekday(p_date date)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_registration_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_course_worksheet_targets(p_course_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND target.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.student_worksheet_logs log
      WHERE log.target_id = target.id
    );

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
$function$;

CREATE OR REPLACE FUNCTION public.sync_universal_worksheet_targets()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  course_record RECORD;
  total_count INTEGER := 0;
BEGIN
  FOR course_record IN SELECT id FROM public.courses WHERE is_active = true LOOP
    total_count := total_count + public.sync_course_worksheet_targets(course_record.id);
  END LOOP;
  RETURN total_count;
END;
$function$;

-- Enable RLS before installing policies.
alter table public."courses" enable row level security;
alter table public."enrollments" enable row level security;
alter table public."master_materials" enable row level security;
alter table public."master_practice_attempts" enable row level security;
alter table public."master_practice_questions" enable row level security;
alter table public."master_practice_sets" enable row level security;
alter table public."master_sessions" enable row level security;
alter table public."master_worksheet_plans" enable row level security;
alter table public."master_worksheet_session_rules" enable row level security;
alter table public."materials" enable row level security;
alter table public."payments" enable row level security;
alter table public."practice_attempts" enable row level security;
alter table public."practice_questions" enable row level security;
alter table public."practice_sets" enable row level security;
alter table public."profiles" enable row level security;
alter table public."registrations" enable row level security;
alter table public."sessions" enable row level security;
alter table public."student_worksheet_logs" enable row level security;
alter table public."worksheet_daily_targets" enable row level security;

-- Production policy definitions.
drop policy if exists "Admins can delete courses" on public."courses";
create policy "Admins can delete courses" on public."courses" as PERMISSIVE for DELETE to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Admins can insert courses" on public."courses";
create policy "Admins can insert courses" on public."courses" as PERMISSIVE for INSERT to public with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Admins can update courses" on public."courses";
create policy "Admins can update courses" on public."courses" as PERMISSIVE for UPDATE to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Authorised users can view courses" on public."courses";
create policy "Authorised users can view courses" on public."courses" as PERMISSIVE for SELECT to public using (can_access_course(id));
drop policy if exists "Admins can manage enrollments" on public."enrollments";
create policy "Admins can manage enrollments" on public."enrollments" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Users can view own enrollments" on public."enrollments";
create policy "Users can view own enrollments" on public."enrollments" as PERMISSIVE for SELECT to public using ((((auth.uid() = user_id) AND is_active_portal_user()) OR is_portal_admin()));
drop policy if exists "Admins can manage master materials" on public."master_materials";
create policy "Admins can manage master materials" on public."master_materials" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Admins can view master materials" on public."master_materials";
create policy "Admins can view master materials" on public."master_materials" as PERMISSIVE for SELECT to public using (is_portal_admin());
drop policy if exists "Admins can manage master practice attempts" on public."master_practice_attempts";
create policy "Admins can manage master practice attempts" on public."master_practice_attempts" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Users can insert own master practice attempts" on public."master_practice_attempts";
create policy "Users can insert own master practice attempts" on public."master_practice_attempts" as PERMISSIVE for INSERT to public with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM enrollments
  WHERE ((enrollments.course_id = master_practice_attempts.course_id) AND (enrollments.user_id = auth.uid()))))));
drop policy if exists "Users can update own master practice attempts" on public."master_practice_attempts";
create policy "Users can update own master practice attempts" on public."master_practice_attempts" as PERMISSIVE for UPDATE to public using ((user_id = auth.uid())) with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM enrollments
  WHERE ((enrollments.course_id = master_practice_attempts.course_id) AND (enrollments.user_id = auth.uid()))))));
drop policy if exists "Users can view own master practice attempts" on public."master_practice_attempts";
create policy "Users can view own master practice attempts" on public."master_practice_attempts" as PERMISSIVE for SELECT to public using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));
drop policy if exists "Admins can manage master practice questions" on public."master_practice_questions";
create policy "Admins can manage master practice questions" on public."master_practice_questions" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Master practice questions viewable by enrolled users" on public."master_practice_questions";
create policy "Master practice questions viewable by enrolled users" on public."master_practice_questions" as PERMISSIVE for SELECT to public using (((EXISTS ( SELECT 1
   FROM enrollments
  WHERE (enrollments.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));
drop policy if exists "Admins can manage master practice sets" on public."master_practice_sets";
create policy "Admins can manage master practice sets" on public."master_practice_sets" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Master practice sets viewable by enrolled users" on public."master_practice_sets";
create policy "Master practice sets viewable by enrolled users" on public."master_practice_sets" as PERMISSIVE for SELECT to public using (((EXISTS ( SELECT 1
   FROM enrollments
  WHERE (enrollments.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));
drop policy if exists "Admins can manage master sessions" on public."master_sessions";
create policy "Admins can manage master sessions" on public."master_sessions" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Admins can view master sessions" on public."master_sessions";
create policy "Admins can view master sessions" on public."master_sessions" as PERMISSIVE for SELECT to public using (is_portal_admin());
drop policy if exists "Admins can manage master worksheet plans" on public."master_worksheet_plans";
create policy "Admins can manage master worksheet plans" on public."master_worksheet_plans" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Worksheet plans viewable by enrolled users" on public."master_worksheet_plans";
create policy "Worksheet plans viewable by enrolled users" on public."master_worksheet_plans" as PERMISSIVE for SELECT to public using (((EXISTS ( SELECT 1
   FROM enrollments
  WHERE (enrollments.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));
drop policy if exists "Admins can manage worksheet rules" on public."master_worksheet_session_rules";
create policy "Admins can manage worksheet rules" on public."master_worksheet_session_rules" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Worksheet rules viewable by enrolled users" on public."master_worksheet_session_rules";
create policy "Worksheet rules viewable by enrolled users" on public."master_worksheet_session_rules" as PERMISSIVE for SELECT to public using (((EXISTS ( SELECT 1
   FROM enrollments
  WHERE (enrollments.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));
drop policy if exists "Admins can manage materials" on public."materials";
create policy "Admins can manage materials" on public."materials" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Authorised users can view materials" on public."materials";
create policy "Authorised users can view materials" on public."materials" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM sessions session
  WHERE ((session.id = materials.session_id) AND can_access_course(session.course_id)))));
drop policy if exists "Admins can manage payments" on public."payments";
create policy "Admins can manage payments" on public."payments" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Admins can manage practice attempts" on public."practice_attempts";
create policy "Admins can manage practice attempts" on public."practice_attempts" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Users can insert own practice attempts" on public."practice_attempts";
create policy "Users can insert own practice attempts" on public."practice_attempts" as PERMISSIVE for INSERT to public with check (((auth.uid() = user_id) AND is_active_portal_user()));
drop policy if exists "Users can update own practice attempts" on public."practice_attempts";
create policy "Users can update own practice attempts" on public."practice_attempts" as PERMISSIVE for UPDATE to public using (((auth.uid() = user_id) AND is_active_portal_user()));
drop policy if exists "Users can view own practice attempts" on public."practice_attempts";
create policy "Users can view own practice attempts" on public."practice_attempts" as PERMISSIVE for SELECT to public using ((((auth.uid() = user_id) AND is_active_portal_user()) OR is_portal_admin()));
drop policy if exists "Active users can view practice questions" on public."practice_questions";
create policy "Active users can view practice questions" on public."practice_questions" as PERMISSIVE for SELECT to public using (is_active_portal_user());
drop policy if exists "Admins can manage practice questions" on public."practice_questions";
create policy "Admins can manage practice questions" on public."practice_questions" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Active users can view practice sets" on public."practice_sets";
create policy "Active users can view practice sets" on public."practice_sets" as PERMISSIVE for SELECT to public using (is_active_portal_user());
drop policy if exists "Admins can manage practice sets" on public."practice_sets";
create policy "Admins can manage practice sets" on public."practice_sets" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Users and admins can view profiles" on public."profiles";
create policy "Users and admins can view profiles" on public."profiles" as PERMISSIVE for SELECT to public using (((auth.uid() = id) OR is_portal_admin()));
drop policy if exists "Admins can manage registrations" on public."registrations";
create policy "Admins can manage registrations" on public."registrations" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Admins can manage sessions" on public."sessions";
create policy "Admins can manage sessions" on public."sessions" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Authorised users can view sessions" on public."sessions";
create policy "Authorised users can view sessions" on public."sessions" as PERMISSIVE for SELECT to public using (can_access_course(course_id));
drop policy if exists "Admins can manage worksheet logs" on public."student_worksheet_logs";
create policy "Admins can manage worksheet logs" on public."student_worksheet_logs" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Students can insert own worksheet logs" on public."student_worksheet_logs";
create policy "Students can insert own worksheet logs" on public."student_worksheet_logs" as PERMISSIVE for INSERT to public with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM enrollments
  WHERE ((enrollments.course_id = student_worksheet_logs.course_id) AND (enrollments.user_id = auth.uid()))))));
drop policy if exists "Students can update own worksheet logs" on public."student_worksheet_logs";
create policy "Students can update own worksheet logs" on public."student_worksheet_logs" as PERMISSIVE for UPDATE to public using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
drop policy if exists "Students can view own worksheet logs" on public."student_worksheet_logs";
create policy "Students can view own worksheet logs" on public."student_worksheet_logs" as PERMISSIVE for SELECT to public using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));
drop policy if exists "Admins can manage worksheet targets" on public."worksheet_daily_targets";
create policy "Admins can manage worksheet targets" on public."worksheet_daily_targets" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
drop policy if exists "Enrolled students can view worksheet targets" on public."worksheet_daily_targets";
create policy "Enrolled students can view worksheet targets" on public."worksheet_daily_targets" as PERMISSIVE for SELECT to public using (((is_active = true) AND ((EXISTS ( SELECT 1
   FROM enrollments
  WHERE ((enrollments.course_id = worksheet_daily_targets.course_id) AND (enrollments.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))));

-- Application trigger definitions.
drop trigger if exists "on_auth_user_created" on "auth"."users";
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
drop trigger if exists "set_master_practice_questions_updated_at" on "public"."master_practice_questions";
CREATE TRIGGER set_master_practice_questions_updated_at BEFORE UPDATE ON master_practice_questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
drop trigger if exists "set_master_practice_sets_updated_at" on "public"."master_practice_sets";
CREATE TRIGGER set_master_practice_sets_updated_at BEFORE UPDATE ON master_practice_sets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
drop trigger if exists "set_payments_updated_at" on "public"."payments";
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_registration_updated_at();
drop trigger if exists "set_registrations_updated_at" on "public"."registrations";
CREATE TRIGGER set_registrations_updated_at BEFORE UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION set_registration_updated_at();

commit;
