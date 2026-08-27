import Link from 'next/link';
import { NotionReader } from '@/components/student/NotionReader';
import { PdfViewer } from '@/components/student/PdfViewer';
import { StudentHeader } from '@/components/student/StudentHeader';
import { WorksheetLog } from '@/components/student/WorksheetLog';
import { WorksheetLogRetry } from '@/components/student/WorksheetLogRetry';
import { extractNotionPageId } from '@/lib/notion';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentWorksheetLog } from '@/lib/server/studentPractice';
import { loadStudentTimeline } from '@/lib/server/studentTimeline';
import { getMaterialAvailabilityCopy } from '@/lib/studentTimeline';
import type { Material } from '@/lib/types';
import { getYoutubeEmbedUrl } from '@/lib/youtube';
import { createClient } from '@/utils/supabase/server';
import '../../../../dashboard/dashboard.css';
import './material.css';

export default async function MaterialViewerPage({
  params,
}: {
  params: Promise<{ id: string; materialId: string }>;
}) {
  const [{ id: sessionId, materialId }, identity] = await Promise.all([
    params,
    requirePortalRole('student'),
  ]);
  const supabase = await createClient();
  const [timelineResult, { data: materialData, error: materialError }] = await Promise.all([
    loadStudentTimeline(identity.id, identity.fullName),
    supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('session_id', sessionId)
      .maybeSingle(),
  ]);

  const studentName = timelineResult.studentName;
  const timeline = timelineResult.status === 'ready' ? timelineResult.timeline : null;
  const timelineSession = timeline?.sessions.find((session) => session.id === sessionId);
  const timelineMaterial = timelineSession?.materials.find((material) => material.id === materialId);
  const timeZone = timeline?.course?.schedule_timezone ?? 'Asia/Kolkata';
  const material = materialData as Material | null;

  if (!material && timelineMaterial && !timelineMaterial.is_available) {
    return (
      <div className="student-page">
        <StudentHeader studentName={studentName} />
        <main className="student-main material-main">
          <section className="student-state">
            <span className="state-kicker">Upcoming material</span>
            <h1>{timelineMaterial.title}</h1>
            <p>{getMaterialAvailabilityCopy(timelineMaterial, timeZone)}. Access remains protected until that release time.</p>
            <Link className="student-button" href={`/session/${sessionId}`}>Return to curriculum item</Link>
          </section>
        </main>
      </div>
    );
  }

  if (materialError || !material || !timelineSession) {
    if (materialError) console.error('Released material load failed:', materialError);
    return (
      <div className="student-page">
        <StudentHeader studentName={studentName} />
        <main className="student-main material-main">
          <section className="student-state student-state-error" role="alert">
            <h1>We couldn&apos;t open this material</h1>
            <p>It may not belong to your course or may not be released yet. Return to the curriculum item for current availability.</p>
            <Link className="student-button" href={`/session/${sessionId}`}>Return to curriculum item</Link>
          </section>
        </main>
      </div>
    );
  }

  const notionPageId = material.type === 'pre_read' && material.notion_url
    ? extractNotionPageId(material.notion_url)
    : null;
  const youtubeEmbedUrl = material.type === 'video' && material.video_url
    ? getYoutubeEmbedUrl(material.video_url)
    : null;
  const trackerAvailable = material.type === 'worksheet' && Boolean(timelineMaterial?.tracker_available);
  const worksheetLogResult = trackerAvailable
    ? await loadStudentWorksheetLog(material.id)
    : null;

  return (
    <div className="student-page">
      <StudentHeader studentName={studentName} />
      <main className="student-main material-main">
        <div className="material-container">
          <Link
            className="session-back-link"
            href={`/dashboard?openWeek=${timelineSession.week_number ?? 0}#session-${sessionId}`}
          >
            ← Back to Timeline
          </Link>
          <header className="material-header">
            <span className="student-eyebrow">{material.type.replace('_', ' ')}</span>
            <h1>{material.title}</h1>
            <p>Available now</p>
          </header>

          <section className="material-content">
            {material.type === 'pre_read' && notionPageId && (
              <NotionReader pageId={notionPageId} sourceUrl={material.notion_url} title={material.title} />
            )}

            {material.type === 'pre_read' && !notionPageId && (
              <div className="material-status material-status-error" role="alert">
                <strong>This pre-read is not configured correctly</strong>
                <p>Contact the programme team and name this curriculum item so they can repair the Notion link.</p>
              </div>
            )}

            {material.type === 'video' && youtubeEmbedUrl && (
              <div className="recording-viewer">
                <div className="video-frame">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={material.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <a className="student-button" href={material.video_url} target="_blank" rel="noreferrer">Open on YouTube</a>
                <p>A public or unlisted YouTube link can be shared after release. The LMS cannot revoke copies of that link.</p>
              </div>
            )}

            {material.type === 'video' && !youtubeEmbedUrl && (
              <div className="material-status material-status-error" role="alert">
                <strong>This recording link is not supported</strong>
                <p>The programme team needs to replace it with a valid YouTube or youtu.be link.</p>
              </div>
            )}

            {material.type === 'class_material' && material.file_url && (
              <PdfViewer fileUrl={material.file_url} title={material.title} />
            )}

            {material.type === 'session_material' && material.file_url && (
              <PdfViewer fileUrl={material.file_url} title={material.title} />
            )}

            {material.type === 'worksheet' && material.file_url && trackerAvailable && (
              <div className="worksheet-workspace-grid">
                <div className="worksheet-pdf-panel">
                  <PdfViewer fileUrl={material.file_url} title={material.title} />
                </div>
                {worksheetLogResult?.status === 'ready' ? (
                  <WorksheetLog worksheet={worksheetLogResult.data} />
                ) : (
                  <section className="worksheet-log worksheet-log-error" id="worksheet-log" role="alert">
                    <span className="student-eyebrow">Manual tracker</span>
                    <h2>We couldn&apos;t load this worksheet log</h2>
                    <p>
                      {worksheetLogResult?.message ?? 'The tracker is not available for this worksheet yet.'}
                    </p>
                    <WorksheetLogRetry />
                  </section>
                )}
              </div>
            )}

            {material.type === 'worksheet' && material.file_url && !trackerAvailable && (
              <PdfViewer fileUrl={material.file_url} title={material.title} />
            )}

            {(material.type === 'worksheet' || material.type === 'class_material' || material.type === 'session_material') && !material.file_url && (
              <div className="material-status material-status-error" role="alert">
                <strong>The file could not be opened</strong>
                <p>Retry from the curriculum item. If the problem continues, contact the programme team.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
