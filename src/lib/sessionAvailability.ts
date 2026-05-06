import type { Material, MaterialType, Session } from '@/lib/types';
import { formatRelativeDate } from '@/lib/utils';

type SessionStatus = 'available' | 'locked' | 'upcoming';

function getIstDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export function getSessionClassStart(sessionDate: string) {
  const istDateKey = getIstDateKey(new Date(sessionDate));
  return new Date(`${istDateKey}T04:30:00.000Z`);
}

export function getSessionClassEnd(sessionDate: string) {
  const istDateKey = getIstDateKey(new Date(sessionDate));
  return new Date(`${istDateKey}T06:30:00.000Z`);
}

export function isSessionPracticeAvailable(session: Session, now = new Date()) {
  return now >= getSessionClassEnd(session.session_date);
}

export function isMaterialAvailable(material: Material, session: Session, now = new Date()) {
  if (material.type === 'pre_read') {
    const classStart = getSessionClassStart(session.session_date);
    const availableDate = new Date(classStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    return now >= availableDate;
  }

  return isSessionPracticeAvailable(session, now);
}

export function getSessionStatus(session: Session, now = new Date()): SessionStatus {
  if (isSessionPracticeAvailable(session, now)) return 'available';

  const classStart = getSessionClassStart(session.session_date);
  const diffDays = (classStart.getTime() - now.getTime()) / (1000 * 3600 * 24);
  if (diffDays <= 7) return 'upcoming';
  return 'locked';
}

export function getAvailabilityText(type: MaterialType, sessionDate: string) {
  if (type === 'pre_read') {
    const classStart = getSessionClassStart(sessionDate);
    const availableDate = new Date(classStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    return formatRelativeDate(availableDate.toISOString());
  }

  return 'after class, 12:00 PM IST';
}
