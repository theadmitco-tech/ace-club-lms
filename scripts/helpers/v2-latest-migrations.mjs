import { readdirSync } from 'node:fs';

// After preparePhase3Database: the older worksheet migrations that its setup skips, then every
// migration after the Phase 6 integration repair, in order. Gives tests the latest schema.
export function applyLatestMigrations({ apply }) {
  for (const name of ['20260731150000_add_private_master_worksheets.sql', '20260731160000_align_master_course.sql', '20260731170000_add_master_worksheet_question_rows.sql']) apply(name);
  for (const name of readdirSync(new URL('../../supabase/migrations/', import.meta.url)).filter(n => n.slice(0, 14) > '20261103120000' && n.endsWith('.sql')).sort()) apply(name);
}
