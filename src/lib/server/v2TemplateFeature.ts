import 'server-only';
import { isV2ProductionBlocked } from '@/lib/v2Environment';

export function isV2TemplateAuthoringEnabled(): boolean {
  return process.env.V2_TEMPLATE_AUTHORING_ENABLED === 'true' && !isV2ProductionBlocked(process.env);
}
