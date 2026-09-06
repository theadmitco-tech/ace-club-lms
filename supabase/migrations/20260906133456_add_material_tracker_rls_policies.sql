begin;

create policy "Authorized users view released material worksheet questions"
on public.material_worksheet_questions
for select
to authenticated
using (
  (select public.is_portal_admin())
  or exists (
    select 1
    from public.materials as material
    join public.sessions as session on session.id = material.session_id
    join public.enrollments as enrollment on enrollment.course_id = session.course_id
    join public.profiles as profile on profile.id = enrollment.user_id
    where material.id = material_worksheet_questions.material_id
      and material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
      and session.is_published = true
      and enrollment.user_id = (select auth.uid())
      and profile.role = 'student'
      and profile.is_active = true
  )
);

create policy "Authorized users view material worksheet logs"
on public.student_material_question_logs
for select
to authenticated
using (
  (select public.is_portal_admin())
  or (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.material_worksheet_questions as question
      join public.materials as material on material.id = question.material_id
      join public.sessions as session on session.id = material.session_id
      join public.enrollments as enrollment on enrollment.course_id = session.course_id
      join public.profiles as profile on profile.id = enrollment.user_id
      where question.id = student_material_question_logs.material_question_id
        and material.type = 'worksheet'
        and material.available_from <= statement_timestamp()
        and session.is_published = true
        and enrollment.user_id = (select auth.uid())
        and profile.role = 'student'
        and profile.is_active = true
    )
  )
);

create policy "Students create own released material worksheet logs"
on public.student_material_question_logs
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.material_worksheet_questions as question
    join public.materials as material on material.id = question.material_id
    join public.sessions as session on session.id = material.session_id
    join public.enrollments as enrollment on enrollment.course_id = session.course_id
    join public.profiles as profile on profile.id = enrollment.user_id
    where question.id = student_material_question_logs.material_question_id
      and material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
      and session.is_published = true
      and enrollment.user_id = (select auth.uid())
      and profile.role = 'student'
      and profile.is_active = true
  )
);

create policy "Students update own released material worksheet logs"
on public.student_material_question_logs
for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.material_worksheet_questions as question
    join public.materials as material on material.id = question.material_id
    join public.sessions as session on session.id = material.session_id
    join public.enrollments as enrollment on enrollment.course_id = session.course_id
    join public.profiles as profile on profile.id = enrollment.user_id
    where question.id = student_material_question_logs.material_question_id
      and material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
      and session.is_published = true
      and enrollment.user_id = (select auth.uid())
      and profile.role = 'student'
      and profile.is_active = true
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.material_worksheet_questions as question
    join public.materials as material on material.id = question.material_id
    join public.sessions as session on session.id = material.session_id
    join public.enrollments as enrollment on enrollment.course_id = session.course_id
    join public.profiles as profile on profile.id = enrollment.user_id
    where question.id = student_material_question_logs.material_question_id
      and material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
      and session.is_published = true
      and enrollment.user_id = (select auth.uid())
      and profile.role = 'student'
      and profile.is_active = true
  )
);

commit;
