import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled, readContentWorkspace } from '@/lib/server/v2ContentPublishing';
import ContentEditor from './ContentEditor';
export default async function ContentPublishingPage({searchParams}:{searchParams:Promise<{item?:string}>}) {
  if(!isV2ContentPublishingEnabled()) notFound();
  await requirePortalRole('admin');
  const [workspace,query]=await Promise.all([readContentWorkspace(),searchParams]);
  return workspace ? <ContentEditor initial={workspace} initialItemId={query.item}/> : <section><h1 className="admin-page-title">Course content</h1><p role="alert">Course content could not be loaded. Reload to retry.</p></section>;
}
