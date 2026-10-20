import 'server-only';

export function isV2TemplateAuthoringEnabled(): boolean {
  return process.env.V2_TEMPLATE_AUTHORING_ENABLED === 'true' && process.env.VERCEL_ENV !== 'production';
}
