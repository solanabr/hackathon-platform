type QueryError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function logQueryError(site: string, error: QueryError): void {
  console.error(`[${site}] query failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

/**
 * A failed read must not be indistinguishable from an empty table: log the
 * PostgREST error and throw so the nearest error boundary renders instead of
 * a plausible empty state.
 */
export function unwrap<T>(
  result: { data: T | null; error: QueryError | null },
  site: string,
): T {
  if (result.error) {
    logQueryError(site, result.error);
    throw new Error(`query failed: ${site}`);
  }
  return result.data as T;
}
