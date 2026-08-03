import Link from 'next/link';
import {
  getMaterialActionLabel,
  getMaterialAvailabilityCopy,
  type StudentTimelineMaterial,
} from '@/lib/studentTimeline';

const MATERIAL_ORDER: StudentTimelineMaterial['type'][] = [
  'pre_read',
  'video',
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
      {orderedMaterials.flatMap((material) => {
        if (!material.is_available) {
          return [(
            <span className="resource-unavailable" key={material.id}>
              <strong>{getMaterialActionLabel(material.type)}</strong>
              <small>{getMaterialAvailabilityCopy(material, timeZone)}</small>
            </span>
          )];
        }

        const actions = [(
          <Link
            className="resource-action"
            href={`/session/${sessionId}/material/${material.id}`}
            key={material.id}
          >
            {getMaterialActionLabel(material.type)}
          </Link>
        )];

        if (material.type === 'worksheet' && material.tracker_available) {
          actions.push(
            <Link
              className="resource-action resource-action-log"
              href={`/session/${sessionId}/material/${material.id}?focus=log#worksheet-log`}
              key={`${material.id}-log`}
            >
              Log
            </Link>,
          );
        }

        return actions;
      })}
    </div>
  );
}
