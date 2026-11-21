import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled, readContentWorkspace } from '@/lib/server/v2ContentPublishing';
import { listV2BatchDrafts } from '@/lib/server/v2Batches';
import { listV2BatchPublications } from '@/lib/server/v2Publications';
import type { CourseDraftSessions } from '@/lib/v2ContentPublishing';
import ContentEditor from './ContentEditor';
export default async function ContentPublishingPage({searchParams}:{searchParams:Promise<{item?:string}>}) {
  if(!isV2ContentPublishingEnabled()) notFound();
  await requirePortalRole('admin');
  const [workspace,query,drafts,publications]=await Promise.all([readContentWorkspace(),searchParams,listV2BatchDrafts(),listV2BatchPublications()]);
  // Saved course drafts let administrators prepare several sessions before one publication.
  const courseDrafts:CourseDraftSessions={};
  if(workspace&&drafts.status==='ready') for(const draft of drafts.drafts) if(draft.sessions&&workspace.courses.some(course=>course.batchId===draft.id)) {
    const published=publications.status==='ready'?publications.publications.find(item=>item.batchId===draft.id&&item.state==='published'):undefined;
    courseDrafts[draft.id]={revision:draft.revision,sessions:draft.sessions,unpublished:!!published&&published.batchRevision!==draft.revision};
  }
  return workspace ? <ContentEditor initial={workspace} initialItemId={query.item} drafts={courseDrafts}/> : <section><h1 className="admin-page-title">Course content</h1><p role="alert">Course content could not be loaded. Reload to retry.</p></section>;
}
