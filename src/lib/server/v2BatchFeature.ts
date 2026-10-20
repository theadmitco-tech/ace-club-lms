import 'server-only';
import { isV2TemplateAuthoringEnabled } from './v2TemplateFeature';

export function isV2BatchAuthoringEnabled(): boolean {
  return process.env.V2_BATCH_AUTHORING_ENABLED === 'true' && isV2TemplateAuthoringEnabled();
}
