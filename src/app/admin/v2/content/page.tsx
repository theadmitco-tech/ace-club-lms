import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled, readContentWorkspace } from '@/lib/server/v2ContentPublishing';
import ContentEditor from './ContentEditor';
export default async function ContentPublishingPage() {
  if(!isV2ContentPublishingEnabled()) notFound();
  await requirePortalRole('admin');const workspace=await readContentWorkspace();
  return <main><header><p>Course publishing</p><h1>Readings, recordings & materials</h1><p>Each item has its own draft and publication. Every confirmation shows the affected courses and sessions.</p></header>
    {workspace ? <ContentEditor initial={workspace}/> : <p role="alert">Content publishing could not be loaded. Reload after staging activation.</p>}</main>;
}
