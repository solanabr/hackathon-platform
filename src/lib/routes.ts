const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/auth/callback",
  "/privacidade",
  "/termos",
  "/pre-registro",
];

// Bare hub only — /h/[slug]... paths are gated separately below.
const PUBLIC_HUB = /^\/h\/?$/;
const PUBLIC_EDITION_LANDING = /^\/h\/[^/]+$/;
// Gallery (/projetos) and one detail level under it, plus builder profiles.
const PUBLIC_EDITION_PROJECTS = /^\/h\/[^/]+\/projetos(\/[^/]+)?$/;
const PUBLIC_BUILDER_PROFILE = /^\/u\/[^/]+$/;

export function isPublicRoute(path: string): boolean {
  return (
    PUBLIC_ROUTES.some((route) => path === route || path.startsWith(route + "/")) ||
    PUBLIC_HUB.test(path) ||
    PUBLIC_EDITION_LANDING.test(path) ||
    PUBLIC_EDITION_PROJECTS.test(path) ||
    PUBLIC_BUILDER_PROFILE.test(path)
  );
}