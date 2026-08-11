import {
  getMaterialAvailabilityCopy,
  type StudentTimelineMaterial,
} from '@/lib/studentTimeline';
import {
  getResourcePrimaryActionLabel,
  ResourceCard,
  type ResourceCardAction,
} from './ResourceCard';

const MATERIAL_ORDER: StudentTimelineMaterial['type'][] = [
  'pre_read',
  'video',
  'session_material',
  'worksheet',
  'class_material',
];

export function ResourceActions({
  sessionId,
  materials,
  timeZone,
  includeClassMaterial = false,
}: {
  sessionId: string;
  materials: StudentTimelineMaterial[];
  timeZone: string;
  includeClassMaterial?: boolean;
}) {
  const orderedMaterials = materials
    .filter((material) => includeClassMaterial || material.type !== 'class_material')
    .sort((left, right) => (
      MATERIAL_ORDER.indexOf(left.type) - MATERIAL_ORDER.indexOf(right.type)
    ));

  if (orderedMaterials.length === 0) return null;

  return (
    <div className="resource-actions" aria-label="Course resources">
      {orderedMaterials.map((material) => {
        const materialHref = `/session/${sessionId}/material/${material.id}`;
        const actions: ResourceCardAction[] = material.is_available
          ? [{ href: materialHref, label: getResourcePrimaryActionLabel(material.type) }]
          : [];

        if (material.is_available && material.type === 'worksheet' && material.tracker_available) {
          actions.push({
            href: `${materialHref}?focus=log#worksheet-log`,
            label: 'Update log',
            secondary: true,
          });
        }

        return (
          <ResourceCard
            actions={actions}
            availability={getMaterialAvailabilityCopy(material, timeZone)}
            key={material.id}
            title={material.title}
            type={material.type}
          />
        );
      })}
    </div>
  );
}
