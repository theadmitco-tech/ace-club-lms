import Link from 'next/link';
import type { TimelineMaterialType } from '@/lib/studentTimeline';

export type ResourceCardType = TimelineMaterialType | 'session_material';

export type ResourceCardAction = {
  href: string;
  label: string;
  secondary?: boolean;
};

const RESOURCE_PRESENTATION: Record<ResourceCardType, { label: string }> = {
  pre_read: { label: 'Pre-read' },
  worksheet: { label: 'Worksheet' },
  video: { label: 'Recording' },
  class_material: { label: 'Class material' },
  session_material: { label: 'Session material' },
};

export function getResourceTypeLabel(type: ResourceCardType) {
  return RESOURCE_PRESENTATION[type].label;
}

export function getResourcePrimaryActionLabel(type: ResourceCardType) {
  if (type === 'pre_read') return 'Open pre-read';
  if (type === 'worksheet') return 'Open worksheet';
  if (type === 'video') return 'Watch recording';
  if (type === 'session_material') return 'Open session material';
  return 'Open material';
}

export function ResourceCard({
  type,
  title,
  availability,
  actions = [],
  context,
}: {
  type: ResourceCardType;
  title: string;
  availability: string;
  actions?: ResourceCardAction[];
  context?: string;
}) {
  const presentation = RESOURCE_PRESENTATION[type];

  return (
    <div className={`resource-card resource-card-${type}`}>
      <div className="resource-card-callout">
        <span className="resource-card-type">{presentation.label}</span>
        <small className="resource-card-availability">{availability}</small>
      </div>
      {context && <span className="resource-card-context">{context}</span>}
      {actions.length > 0 && (
        <div className="resource-card-actions" aria-label={`${presentation.label} actions for ${title}`}>
          {actions.map((action, index) => (
            <Link
              aria-label={`${action.label}: ${title}`}
              className={`resource-card-action${index === 0 ? ' resource-card-title-action' : ''}${action.secondary ? ' resource-card-action-secondary' : ''}`}
              href={action.href}
              key={`${action.href}-${action.label}`}
            >
              {index === 0 ? title : action.label}
            </Link>
          ))}
        </div>
      )}
      {actions.length === 0 && (
        <span className="resource-card-locked-title" aria-label={`${title}. ${availability}`}>
          {title}
        </span>
      )}
    </div>
  );
}
