import 'server-only';
import { v2Project } from '@/lib/v2Environment';

// Staging in Preview/local development, or the approved Production project when released.
export function isV2LearningEnabled(): boolean {
  return process.env.V2_LEARNING_DELIVERY_ENABLED === 'true' && v2Project(process.env) !== null;
}
