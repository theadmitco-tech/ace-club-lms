import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { getMyDisplayName } from '@/lib/server/studentProfile';
import { getMyV2WorksheetLog } from '@/lib/server/v2WorksheetLogs';
import { StudentHeader } from '@/components/student/StudentHeader';
import { WorksheetLog } from '@/components/student/WorksheetLog';
import { v2CourseResourceHref } from '@/lib/v2SessionPresentation';
import '../../../../../../dashboard/dashboard.css';
import '../../../../../../session/[id]/material/[materialId]/material.css';
import '../../../../../../session/[id]/session.css';

const SECTION: Record<string, string> = { quant: 'Quant', verbal: 'Verbal', di: 'DI' };

/** A V2 worksheet beside its practice log, for a worksheet the student can currently open. */
export default async function V2WorksheetLogPage({ params }: { params: Promise<{ batchId: string; sessionKey: string; itemKey: string }> }) {
  if (!isV2LearningEnabled()) notFound();
  const identity = await requirePortalRole('student');
  const { batchId, sessionKey, itemKey } = await params;
  const [log, studentName] = await Promise.all([getMyV2WorksheetLog(batchId, sessionKey, itemKey), getMyDisplayName()]);
  const subject = log?.section && SECTION[log.section];
  const pdf = log ? v2CourseResourceHref(log.url, { mode: 'student', sessionKey, batchId, itemKey }) : null;
  const back = `/schedule/v2/${batchId}${subject ? `?subject=${log!.section}&session=${sessionKey}` : ''}`;
  return <div className="student-page"><StudentHeader studentName={studentName} /><main className="student-main"><div className="student-container">
    <Link className="session-back-link" href={back}>← Back to {log?.sessionTitle || 'the session'}</Link>
    {!log ? <section className="student-state" role="alert"><h1>This worksheet isn’t available</h1><p>It may be paused until you send feedback for this subject, or your access may have ended. <Link href="/account/access">Check My access</Link>.</p></section> : <>
      <header className="material-header">
        <span className="student-eyebrow">{subject ? `${subject} · ` : ''}Worksheet</span>
        <h1>{log.title}</h1>
        <p>{log.sessionTitle}</p>
      </header>
      <section className="material-content">
        <div className="worksheet-workspace-grid">
          <div className="worksheet-pdf-panel file-workspace">
            {pdf ? <iframe src={pdf} title={log.title} /> : <p className="material-status">This worksheet opens from its session page.</p>}
          </div>
          {log.questions.length
            ? <WorksheetLog key={`${identity.id}:${itemKey}`} ownerId={identity.id} v2={{ batchId, sessionKey, itemKey }}
                worksheet={{ material_id: itemKey, session_id: sessionKey, course_id: batchId, title: log.title, session_title: log.sessionTitle, section: log.section, week_number: 0, questions: log.questions }} />
            : <section className="worksheet-log" id="worksheet-log"><span className="student-eyebrow">Practice log</span><h2>No practice log for this worksheet</h2><p>This worksheet doesn’t have numbered questions to log. You can still work through it on the left.</p></section>}
        </div>
      </section>
    </>}
  </div></main></div>;
}
