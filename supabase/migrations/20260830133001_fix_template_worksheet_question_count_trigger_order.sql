begin;

-- PostgreSQL runs triggers with the same timing/event alphabetically. The
-- legacy link_copied_master_worksheet trigger runs after the original
-- apply_template_resource_question_count trigger and clears question_count
-- when a template-native worksheet has no matching Master material. Run the
-- template count trigger after the legacy linker so the template is final.
drop trigger if exists apply_template_resource_question_count on public.materials;
drop trigger if exists set_template_resource_question_count on public.materials;
create trigger set_template_resource_question_count
before insert or update of source_template_resource_id, type, question_count
on public.materials
for each row execute function public.apply_template_resource_question_count();

commit;
