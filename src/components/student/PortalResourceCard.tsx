import type { StudentTimelineMaterial } from '@/lib/studentTimeline';
import { getResourcePrimaryActionLabel, ResourceCard, type ResourceCardAction } from './ResourceCard';

const CATEGORY_LABELS: Record<string, string> = {
  starter_pack: 'Starter Pack',
  pre_read: 'Pre-read',
  worksheet: 'Worksheet',
  session_material: 'Session Material',
  recording: 'Class Recording',
  post_class: 'Post-class',
  reference: 'Reference',
  other: 'Other',
};

export function getPortalResourceContext(resource: StudentTimelineMaterial) {
  const category = CATEGORY_LABELS[resource.category ?? ''] ?? 'Resource';
  if (resource.session_title) return `${category} · ${resource.session_title}`;
  if (resource.section_key) return `${category} · ${resource.section_key.toUpperCase()}`;
  if (resource.resource_scope === 'batch') return `${category} · Whole batch`;
  if (resource.resource_scope === 'standalone') return `${category} · Standalone`;
  return category;
}

function getActions(resource: StudentTimelineMaterial): ResourceCardAction[] {
  if (resource.session_id) {
    return [{
      href: `/session/${resource.session_id}/material/${resource.id}`,
      label: getResourcePrimaryActionLabel(resource.type),
    }];
  }
  if (resource.resource_format === 'notion' && resource.notion_url) {
    return [{ href: resource.notion_url, label: 'Open in Notion' }];
  }
  if (resource.resource_format === 'pdf' && resource.file_url) {
    return [{ href: resource.file_url, label: 'Open PDF' }];
  }
  if (resource.resource_format === 'youtube' && resource.video_url) {
    return [{ href: resource.video_url, label: 'Watch on YouTube' }];
  }
  return [];
}

export function PortalResourceCard({
  resource,
  hideDetails = false,
}: {
  resource: StudentTimelineMaterial;
  hideDetails?: boolean;
}) {
  const typeLabel = CATEGORY_LABELS[resource.category ?? ''] ?? undefined;
  return (
    <ResourceCard
      actions={getActions(resource)}
      availability="Available now"
      context={getPortalResourceContext(resource)}
      description={resource.resource_format === 'text' ? resource.text_content : null}
      hideDetails={hideDetails}
      title={resource.title}
      type={resource.type}
      typeLabel={typeLabel}
    />
  );
}
