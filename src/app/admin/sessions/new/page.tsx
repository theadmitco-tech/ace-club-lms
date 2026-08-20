import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { createClient } from '@/utils/supabase/server';
import NewBatchEventForm from './NewBatchEventForm';

export default async function NewBatchEventPage({ searchParams }: { searchParams: Promise<{ course_id?: string }> }) {
  await requirePortalRole('admin');
  const { course_id: courseId } = await searchParams;
  if (!courseId) return <p role="alert">Choose a batch from Manage Schedule first.</p>;
  const supabase = await createClient();
  const { data: course } = await supabase.from('courses')
    .select('id, name, schedule_revision, source_template_revision_id')
    .eq('id', courseId).maybeSingle();
  if (!course?.source_template_revision_id) return <p role="alert">Extra events are available only for Phase 2 template-created batches.</p>;
  return <NewBatchEventForm course={{ id: course.id, name: course.name, scheduleRevision: course.schedule_revision }} />;
}
