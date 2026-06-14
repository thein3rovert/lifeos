/**
 * Normalize an unknown thrown value into an Error instance.
 */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  return new Error('An unexpected error occurred');
}

/**
 * Extract a human-readable message from an unknown thrown value.
 */
export function getErrorMessage(err: unknown): string {
  return toError(err).message;
}
