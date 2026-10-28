import 'server-only';
import { isV2BatchAuthoringEnabled } from './v2BatchFeature';

export function isV2StudentScheduleEnabled(): boolean {
  return process.env.V2_STUDENT_SCHEDULE_ENABLED === 'true' && isV2BatchAuthoringEnabled();
}
