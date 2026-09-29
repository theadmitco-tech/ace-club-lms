import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { MockBuilder } from '@/components/admin/MockBuilder';
import { listMockAssessments, loadMockBuilderReference } from '@/lib/server/mockBuilder';
export default async function MockBuilderPage() {
  await requirePortalRole('admin');
  let assessments: Awaited<ReturnType<typeof listMockAssessments>> | null = null;
  let reference: Awaited<ReturnType<typeof loadMockBuilderReference>> | null = null;
  let loadError = false;
  try {
    [assessments, reference] = await Promise.all([listMockAssessments(), loadMockBuilderReference()]);
  } catch (error) {
    console.error('Mock Builder page load failed:', error);
    loadError = true;
  }
  return <div className="animate-fade-in"><div className="admin-page-header"><div><h1 className="admin-page-title">Mock Builder</h1><p className="admin-page-subtitle">Compose, validate, publish and release fixed GMAT mock versions.</p></div></div>{loadError || !assessments || !reference ? <div className="admin-card mock-status" role="alert">Mock Builder could not load. The server needs the Staging <code>SUPABASE_SERVICE_ROLE_KEY</code>; restart the local server after adding it.</div> : <MockBuilder initialAssessments={assessments as never} reference={reference as never} />}</div>;
}
