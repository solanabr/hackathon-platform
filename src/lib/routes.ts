const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/auth/callback",
];

const PUBLIC_EDITION_LANDING = /^\/h\/[^/]+$/;

export function isPublicRoute(path: string): boolean {
  return (
    PUBLIC_ROUTES.some((route) => path === route || path.startsWith(route + "/")) ||
    PUBLIC_EDITION_LANDING.test(path)
  );
}