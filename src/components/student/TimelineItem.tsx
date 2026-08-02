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
}: {
  session: StudentTimelineSession;
  timeZone: string;
}) {
  const sectionLabel = session.class_type && (
    isAcademicSection(session.class_type)
      ? session.class_type
      : EVENT_LABELS[session.class_type] ?? 'Programme'
  );

  return (
    <article className="timeline-item" id={`session-${session.id}`}>
      <div className="timeline-marker" aria-hidden="true" />
      <div className="timeline-card">
        <div className="timeline-card-heading">
          <div>
            <div className="timeline-meta">
              {sectionLabel && <span className="timeline-type">{sectionLabel}</span>}
              <span>{formatProgrammeDateTime(session.session_date, timeZone)}</span>
            </div>
            <h3>{session.title}</h3>
            {session.instructor && <p>With {session.instructor}</p>}
          </div>
          <Link className="text-link" href={`/session/${session.id}`}>View details</Link>
        </div>

        <ResourceActions sessionId={session.id} materials={session.materials} timeZone={timeZone} />
      </div>
    </article>
  );
}
