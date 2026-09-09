/** Lê um token de tempo do CSS para quem anima em JS.
 *
 * O ponto não é a conveniência: é que animação em JS não pode ter a própria
 * escala de tempo. Se o rAF usa 1300ms cravado e o CSS usa var(--dur-lenta),
 * as duas camadas divergem — e divergem de vez em movimento reduzido, onde o
 * token encolhe e o número cravado não. Uma fonte só. */
export function readMotionSeconds(token: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  if (!raw) return fallback;
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return fallback;
  return raw.endsWith("ms") ? value / 1000 : value;
}
