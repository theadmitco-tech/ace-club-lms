create or replace function private.enforce_mock_response_progression()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_current_item_id uuid;
begin
  select s.status, a.current_item_id
  into v_status, v_current_item_id
  from public.mock_attempt_items i
  join public.mock_attempt_sections s on s.id = i.attempt_section_id
  join public.mock_attempts a on a.id = i.attempt_id
  where i.id = new.attempt_item_id;

  if v_status = 'active' and new.response is distinct from old.response then
    if new.attempt_item_id <> v_current_item_id then
      raise exception 'ONLY_CURRENT_QUESTION_ANSWERABLE' using errcode = '22023';
    end if;
    if old.response is not null then
      raise exception 'RESPONSE_ALREADY_CONFIRMED' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_mock_response_progression on public.mock_responses;
create trigger enforce_mock_response_progression
before update of response on public.mock_responses
for each row execute function private.enforce_mock_response_progression();

create or replace function private.enforce_mock_navigation_progression()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_section public.mock_attempt_sections%rowtype;
  v_current public.mock_attempt_items%rowtype;
  v_target public.mock_attempt_items%rowtype;
  v_response jsonb;
begin
  if new.current_item_id is not distinct from old.current_item_id or new.current_item_id is null then
    return new;
  end if;

  select * into v_section
  from public.mock_attempt_sections
  where attempt_id = old.id and sequence_index = old.current_section_index;

  select * into v_target from public.mock_attempt_items where id = new.current_item_id;
  if not found or v_target.attempt_section_id <> v_section.id then
    raise exception 'ITEM_NOT_IN_SECTION' using errcode = '22023';
  end if;

  if v_section.status = 'active' then
    if old.current_item_id is null then
      if v_target.display_order <> 1 then
        raise exception 'QUESTIONS_MUST_BE_SEQUENTIAL' using errcode = '22023';
      end if;
      return new;
    end if;
    select * into v_current from public.mock_attempt_items where id = old.current_item_id;
    select response into v_response from public.mock_responses where attempt_item_id = old.current_item_id;
    if v_response is null then
      raise exception 'ANSWER_REQUIRED' using errcode = '22023';
    end if;
    if v_target.display_order <> v_current.display_order + 1 then
      raise exception 'QUESTIONS_MUST_BE_SEQUENTIAL' using errcode = '22023';
    end if;
  elsif v_section.status <> 'review' then
    raise exception 'SECTION_NOT_ACTIVE' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_mock_navigation_progression on public.mock_attempts;
create trigger enforce_mock_navigation_progression
before update of current_item_id on public.mock_attempts
for each row execute function private.enforce_mock_navigation_progression();

create or replace function private.enforce_mock_section_review_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_order integer;
  v_last_order integer;
begin
  if old.status = 'active' and new.status = 'review' then
    if exists (
      select 1
      from public.mock_attempt_items i
      join public.mock_responses r on r.attempt_item_id = i.id
      where i.attempt_section_id = old.id and r.response is null
    ) then
      raise exception 'ALL_QUESTIONS_MUST_BE_ANSWERED' using errcode = '22023';
    end if;
    select i.display_order into v_current_order
    from public.mock_attempts a
    join public.mock_attempt_items i on i.id = a.current_item_id
    where a.id = old.attempt_id;
    select max(display_order) into v_last_order from public.mock_attempt_items where attempt_section_id = old.id;
    if v_current_order is distinct from v_last_order then
      raise exception 'SECTION_NOT_COMPLETE' using errcode = '22023';
    end if;
  end if;
  if old.status = 'active' and new.status = 'submitted' then
    raise exception 'QUESTION_REVIEW_REQUIRED' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_mock_section_review_rules on public.mock_attempt_sections;
create trigger enforce_mock_section_review_rules
before update of status on public.mock_attempt_sections
for each row execute function private.enforce_mock_section_review_rules();

create or replace function private.preserve_optional_break_after_first_section()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.break_status = 'available' and new.break_status = 'consumed' and old.current_section_index = 1 then
    new.break_status := 'available';
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_optional_break_after_first_section on public.mock_attempts;
create trigger preserve_optional_break_after_first_section
before update of break_status on public.mock_attempts
for each row execute function private.preserve_optional_break_after_first_section();

revoke all on function private.enforce_mock_response_progression() from public, anon, authenticated;
revoke all on function private.enforce_mock_navigation_progression() from public, anon, authenticated;
revoke all on function private.enforce_mock_section_review_rules() from public, anon, authenticated;
revoke all on function private.preserve_optional_break_after_first_section() from public, anon, authenticated;
