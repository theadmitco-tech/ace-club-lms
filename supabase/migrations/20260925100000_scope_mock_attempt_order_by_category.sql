-- Flexible mocks may contain multiple categories from one parent section, such
-- as Reading Comprehension and Critical Reasoning. Attempt sections were moved
-- to category-key uniqueness in 20260924120000. Item display order must follow
-- the same category snapshot rather than only the parent GMAT section.

alter table public.mock_attempt_items
  drop constraint if exists mock_attempt_items_attempt_id_display_order_section_key;

alter table public.mock_attempt_items
  add constraint mock_attempt_items_attempt_id_display_order_category_key_key
  unique (attempt_id, display_order, category_key);
