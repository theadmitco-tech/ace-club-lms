import type { V2Publication } from './v2Publications';

export type V2LiveMapping = { eventKey: string; sessionKey: string; publicationRevision: number };
export type V2LiveMappingSuggestion = { eventKey: string; sessionKey: string; source: 'confirmed' | 'previous' | 'title' | 'none' };

// Mapping history belongs to the supplied batch. Suggestions never confirm links.
export function suggestV2LiveMappings(publication: V2Publication, mappings: readonly V2LiveMapping[]): V2LiveMappingSuggestion[] {
  const events = publication.events.filter(event => event.kind === 'live');
  return events.map(event => {
    const none: V2LiveMappingSuggestion = { eventKey: event.key, sessionKey: '', source: 'none' };
    if (publication.state !== 'published') return none;
    const sessions = (publication.sessions ?? []).filter(session => session.section === event.section);
    const current = mappings.find(mapping => mapping.eventKey === event.key && mapping.publicationRevision === publication.revision);
    if (current) return { eventKey: event.key, sessionKey: current.sessionKey, source: 'confirmed' };
    const previous = mappings.filter(mapping => mapping.eventKey === event.key && mapping.publicationRevision < publication.revision)
      .sort((a, b) => b.publicationRevision - a.publicationRevision)[0];
    if (previous && sessions.some(session => session.key === previous.sessionKey)) {
      return { eventKey: event.key, sessionKey: previous.sessionKey, source: 'previous' };
    }
    const matches = sessions.filter(session => session.title === event.title);
    const matchingEvents = events.filter(item => item.section === event.section && item.title === event.title);
    return matches.length === 1 && matchingEvents.length === 1
      ? { eventKey: event.key, sessionKey: matches[0].key, source: 'title' }
      : none;
  });
}
