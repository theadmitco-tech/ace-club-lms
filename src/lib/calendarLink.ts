// A Google Calendar "add event" link. Times are sent in UTC, so the event lands at the right
// local time for the student. Nothing is stored or sent anywhere until the student saves it.
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function googleCalendarLink(event: { title: string; startsAt: string; endsAt?: string | null; details?: string; durationMinutes?: number }): string | null {
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start)) return null;
  const end = event.endsAt && Number.isFinite(Date.parse(event.endsAt)) ? event.endsAt : new Date(start + (event.durationMinutes ?? 60) * 60000).toISOString();
  const query = new URLSearchParams({ action: 'TEMPLATE', text: event.title.slice(0, 200), dates: `${stamp(event.startsAt)}/${stamp(end)}`, details: (event.details ?? '').slice(0, 1000) });
  return `https://calendar.google.com/calendar/render?${query}`;
}

/** Absolute site link for calendar details, when the public site address is configured. */
export function siteLink(path: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  return origin ? `${origin}${path}` : '';
}
