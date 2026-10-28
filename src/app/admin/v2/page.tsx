import { notFound } from 'next/navigation';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2TemplateAuthoringEnabled } from '@/lib/server/v2TemplateFeature';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';

export default async function CoursePublishingPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  await requirePortalRole('admin');
  const templatesEnabled = isV2TemplateAuthoringEnabled();
  const batchesEnabled = isV2BatchAuthoringEnabled();
  const previewWorkspace = process.env.VERCEL_ENV === 'preview';
  return <div>
    <h1 className="admin-page-title">Course publishing</h1>
    <p className="admin-page-subtitle">Create Full Course or individual Quant, Verbal and DI offerings, then prepare each batch for publication.</p>
    {(!templatesEnabled || !batchesEnabled) && <section className="workspace-notice" role="status">
      <h2>Preview setup is pending</h2>
      <p>Explore the course editors below. Saving drafts and publishing will become available after staging setup is complete.</p>
      <p>Existing courses and materials have not been imported into this workspace.</p>
    </section>}
    <div className="workspace-overview"><section className="admin-card">
      <span className="workspace-step">01 / BUILD THE CURRICULUM</span>
      <h2>Prepare course content</h2>
      <p>Arrange sessions with materials, recordings and pre-session and post-session readings. Content without a live class does not need a date.</p>
      {(templatesEnabled || previewWorkspace) ? <Link href="/admin/v2/templates" prefetch={false}>Open course templates</Link> : <p>Course templates are awaiting Preview setup.</p>}
    </section>
    <section className="admin-card">
      <span className="workspace-step">02 / REVIEW &amp; PUBLISH</span>
      <h2>Prepare and publish a batch</h2>
      <p>Create an independent batch, schedule its live classes, keep meeting details private, and preview before publishing. Published batches can be edited, unpublished and republished.</p>
      {(batchesEnabled || previewWorkspace) ? <Link href="/admin/v2/batches" prefetch={false}>Open batches and publishing</Link> : <p>Batch publishing is awaiting Preview setup.</p>}
    </section>
    </div><section className="admin-card">
      <h2>Existing courses</h2>
      <p>Existing batches remain in their current workspace until their content transfer is reviewed and completed.</p>
      <Link href="/admin/courses" prefetch={false}>Open existing batches</Link>
    </section>
  </div>;
}
