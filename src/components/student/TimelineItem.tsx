import Link from 'next/link';
import {
  formatProgrammeDateTime,
  isAcademicSection,
  type StudentTimelineSession,
} from '@/lib/studentTimeline';
import { ResourceActions } from './ResourceActions';

const EVENT_LABELS: Record<string, string> = {
  ORIENTATION: 'Orientation',
  MOCK: 'Mock',
  BREAK: 'Break',
  SUPPORT: 'Support',
};

export function TimelineItem({
  session,
  timeZone,
  isCurrent = false,
}: {
  session: StudentTimelineSession;
  timeZone: string;
  isCurrent?: boolean;
}) {
  const sectionLabel = session.class_type && (
    isAcademicSection(session.class_type)
      ? session.class_type
      : EVENT_LABELS[session.class_type] ?? 'Programme'
  );
  const isAcademic = isAcademicSection(session.class_type);
  const materialTypes = new Set(session.materials.map((material) => material.type));

  return (
    <article className={`timeline-item${isCurrent ? ' is-current' : ''}`} id={`session-${session.id}`}>
      <div className="timeline-marker" aria-hidden="true" />
      <div className="timeline-card">
        <div className="timeline-card-heading">
          <div>
            <div className="timeline-meta">
              {sectionLabel && <span className="timeline-type">{sectionLabel}</span>}
              <span>{formatProgrammeDateTime(session.session_date, timeZone)}</span>
              {isCurrent && <span className="current-label">Current item</span>}
            </div>
            <h3>{session.title}</h3>
            {session.instructor && <p>With {session.instructor}</p>}
          </div>
          <Link className="text-link" href={`/session/${session.id}`}>View details</Link>
        </div>

        {isAcademic && (
          <ol className="journey-order" aria-label="Learning journey">
            <li className={materialTypes.has('pre_read') ? 'configured' : 'not-configured'}>
              <span>1</span><div><strong>Pre-read</strong><small>{materialTypes.has('pre_read') ? 'Prepare before class' : 'Not configured'}</small></div>
            </li>
            <li className="configured">
              <span>2</span><div><strong>Class</strong><small>{session.instructor ? `With ${session.instructor}` : 'Scheduled class'}</small></div>
            </li>
            <li className={materialTypes.has('video') ? 'configured' : 'not-configured'}>
              <span>3</span><div><strong>Recording</strong><small>{materialTypes.has('video') ? 'Available after class' : 'Not configured'}</small></div>
            </li>
            <li className={materialTypes.has('worksheet') ? 'configured' : 'not-configured'}>
              <span>4</span><div><strong>Worksheet</strong><small>{materialTypes.has('worksheet') ? 'Available after class' : 'Not configured'}</small></div>
            </li>
          </ol>
        )}

        <ResourceActions sessionId={session.id} materials={session.materials} timeZone={timeZone} />
      </div>
    </article>
  );
}
