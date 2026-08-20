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

function formatReportingTime(value: string) {
  const [hourValue, minuteValue] = value.split(':').map(Number);
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return value;
  const suffix = hourValue >= 12 ? 'PM' : 'AM';
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, '0')} ${suffix}`;
}

export function TimelineItem({
  session,
  timeZone,
}: {
  session: StudentTimelineSession;
  timeZone: string;
}) {
  const eventKey = session.event_type?.toUpperCase();
  const sectionCandidate = session.section_key?.toUpperCase() ?? session.class_type;
  const sectionLabel = eventKey && eventKey !== 'LIVE_CLASS'
    ? EVENT_LABELS[eventKey] ?? 'Programme'
    : sectionCandidate && (isAcademicSection(sectionCandidate)
      ? sectionCandidate
      : EVENT_LABELS[sectionCandidate] ?? sectionCandidate);
  const instructions = session.instructions?.trim();

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
            {(session.venue || session.reporting_time) && (
              <p className="timeline-event-details">
                {session.venue && <span>Venue: {session.venue}</span>}
                {session.reporting_time && <span>Report by {formatReportingTime(session.reporting_time)}</span>}
              </p>
            )}
            {instructions && <p className="timeline-instructions">{instructions}</p>}
          </div>
          <Link className="text-link" href={`/session/${session.id}`}>View details</Link>
        </div>

        <ResourceActions includeClassMaterial sessionId={session.id} materials={session.materials} timeZone={timeZone} />
      </div>
    </article>
  );
}
