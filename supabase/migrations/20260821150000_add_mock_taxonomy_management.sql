begin;

-- Canonical taxonomy integrity: child sections always inherit their active parent section.
create or replace function public.enforce_mock_topic_parent_section()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare parent_section text;
begin
  if new.parent_id is null then return new; end if;
  select topic.section into parent_section from public.mock_topics topic where topic.id = new.parent_id;
  if parent_section is null then raise exception 'Taxonomy parent topic not found' using errcode = '23503'; end if;
  if new.section <> parent_section then raise exception 'A subtopic must inherit its parent topic section' using errcode = '23514'; end if;
  if new.parent_id = new.id then raise exception 'A topic cannot be its own parent' using errcode = '23514'; end if;
  return new;
end;
$$;
drop trigger if exists enforce_mock_topic_parent_section on public.mock_topics;
create trigger enforce_mock_topic_parent_section
before insert or update of parent_id, section on public.mock_topics
for each row execute function public.enforce_mock_topic_parent_section();
revoke all on function public.enforce_mock_topic_parent_section() from public, anon, authenticated;

-- Controlled canonical additions required by the ready UNNATI package. No question import occurs here.
insert into public.mock_topics(code, label, section)
select value.code, value.label, value.section
from (values
  ('statistics', 'Statistics', 'quant'),
  ('probability', 'Probability', 'quant')
) as value(code, label, section)
where not exists (select 1 from public.mock_topics topic where topic.code = value.code);

insert into public.mock_topics(code, label, section, parent_id)
select value.code, value.label, parent.section, parent.id
from (values
  ('comparing-fractions-decimals-roots', 'Comparing fractions, decimals and roots', 'arithmetic'),
  ('divisibility-and-factors', 'Divisibility and factors', 'arithmetic'),
  ('averages-arithmetic-mean', 'Averages (arithmetic mean)', 'statistics'),
  ('probability-and-averages', 'Probability and averages', 'probability')
) as value(code, label, parent_code)
join public.mock_topics parent on parent.code = value.parent_code
where not exists (select 1 from public.mock_topics topic where topic.code = value.code);

commit;
