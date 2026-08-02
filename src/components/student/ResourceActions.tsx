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
}: {
  sessionId: string;
  materials: StudentTimelineMaterial[];
  timeZone: string;
}) {
  const orderedMaterials = [...materials].sort((left, right) => (
    MATERIAL_ORDER.indexOf(left.type) - MATERIAL_ORDER.indexOf(right.type)
  ));

  if (orderedMaterials.length === 0) return null;

  return (
    <div className="resource-actions" aria-label="Course resources">
      {orderedMaterials.map((material) => (
        material.is_available ? (
          <Link
            className="resource-action"
            href={`/session/${sessionId}/material/${material.id}`}
            key={material.id}
          >
            {getMaterialActionLabel(material.type)}
          </Link>
        ) : (
          <span className="resource-unavailable" key={material.id}>
            <strong>{getMaterialActionLabel(material.type)}</strong>
            <small>{getMaterialAvailabilityCopy(material, timeZone)}</small>
          </span>
        )
      ))}
    </div>
  );
}
