// Database clients can reject with plain objects rather than Error instances.
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error
    && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return fallback;
}
