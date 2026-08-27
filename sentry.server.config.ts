import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
  enableLogs: false,
  // unwrap() already reported the query failure with full context before
  // rethrowing this generic wrapper — capturing it again would make every DB
  // error a second, information-free issue.
  ignoreErrors: [/^query failed: /],
});
