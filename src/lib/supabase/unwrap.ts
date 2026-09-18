import * as Sentry from "@sentry/nextjs";

type QueryError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

/**
 * PostgREST rejects a token minted a moment ago when its clock runs a second
 * behind Auth's ("JWT issued at future", PGRST303). The page then fails on the
 * very first request after login; the same query succeeds a second later. One
 * retry covers it. Callers pass a factory because a query builder is not
 * reusable once awaited.
 */
export async function withClockSkewRetry<T extends { error: QueryError | null }>(
  run: () => PromiseLike<T>,
  delayMs = 1000,
): Promise<T> {
  const first = await run();
  if (first.error?.code !== "PGRST303") return first;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return run();
}

export function logQueryError(site: string, error: QueryError): void {
  console.error(`[${site}] query failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
  // PostgREST errors are plain objects and serialize badly — wrap in a real
  // Error so Sentry gets a stack and a stable grouping per call site.
  Sentry.captureException(new Error(`${site}: ${error.message ?? "query failed"}`), {
    tags: { source: "supabase", site },
    extra: { code: error.code, details: error.details, hint: error.hint },
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
