import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { listCourseTemplates } from '@/lib/server/courseTemplates';
import CoursesClient from './CoursesClient';

export default async function AdminCoursesPage() {
  await requirePortalRole('admin');
  const templates = await listCourseTemplates();
  return <CoursesClient templates={templates} />;
}
