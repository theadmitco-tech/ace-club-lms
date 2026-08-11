import Link from 'next/link';
import type { TimelineMaterialType } from '@/lib/studentTimeline';

export type ResourceCardType = TimelineMaterialType | 'session_material';

export type ResourceCardAction = {
  href: string;
  label: string;
  secondary?: boolean;
};

const RESOURCE_PRESENTATION: Record<ResourceCardType, { icon: string; label: string }> = {
  pre_read: { icon: 'PR', label: 'Pre-read' },
  worksheet: { icon: 'WS', label: 'Worksheet' },
  video: { icon: 'REC', label: 'Recording' },
  class_material: { icon: 'CM', label: 'Class material' },
  session_material: { icon: 'SM', label: 'Session material' },
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
      <div className="resource-card-icon" aria-hidden="true">{presentation.icon}</div>
      <div className="resource-card-copy">
        <span className="resource-card-type">{presentation.label}</span>
        <strong className="resource-card-title">{title}</strong>
        {context && <span className="resource-card-context">{context}</span>}
        <small className="resource-card-availability">{availability}</small>
      </div>
      {actions.length > 0 && (
        <div className="resource-card-actions" aria-label={`${presentation.label} actions for ${title}`}>
          {actions.map((action) => (
            <Link
              className={`resource-card-action${action.secondary ? ' resource-card-action-secondary' : ''}`}
              href={action.href}
              key={`${action.href}-${action.label}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
