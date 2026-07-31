import type { Material, MaterialType, Session } from '@/lib/types';
import { formatRelativeDate } from '@/lib/utils';

type SessionStatus = 'available' | 'locked' | 'upcoming';

export function getSessionClassStart(sessionDate: string) {
  return new Date(sessionDate);
}

export function getSessionClassEnd(sessionDate: string, sessionEndAt?: string | null) {
  if (sessionEndAt) return new Date(sessionEndAt);
  return new Date(new Date(sessionDate).getTime() + 2 * 60 * 60 * 1000);
}

export function isSessionPracticeAvailable(session: Session, now = new Date()) {
  return now >= getSessionClassEnd(session.session_date, session.session_end_at);
}

export function isMaterialAvailable(material: Material, _session: Session, now = new Date()) {
  return now >= new Date(material.available_from);
}

export function getSessionStatus(session: Session, now = new Date()): SessionStatus {
  if (isSessionPracticeAvailable(session, now)) return 'available';

  const classStart = getSessionClassStart(session.session_date);
  const diffDays = (classStart.getTime() - now.getTime()) / (1000 * 3600 * 24);
  if (diffDays <= 7) return 'upcoming';
  return 'locked';
}

export function getAvailabilityText(type: MaterialType, sessionDate: string, availableFrom?: string) {
  if (availableFrom) return formatRelativeDate(availableFrom);

  if (type === 'pre_read') {
    const classStart = getSessionClassStart(sessionDate);
    const availableDate = new Date(classStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    return formatRelativeDate(availableDate.toISOString());
  }

  return 'after class';
}
