/* A ATMOSFERA DA PREMIAÇÃO — o ar em volta do pódio.
 *
 * Três camadas e um véu, na ordem em que a luz chega: a aurora anda atrás de
 * tudo, o brilho respira no horizonte, o chão foge em perspectiva e o grão do
 * papel fecha por cima. O véu de creme é o que garante que o texto continue
 * lendo sobre a cor — sem ele a faixa de baixo perde contraste no `muted`.
 *
 * Nada aqui mede, recebe clique ou entra na ordem de leitura: o desenho vive
 * inteiro no CSS (`.prizes-*` em globals.css) e a section só o hospeda. */
export function PrizesAtmosphere({ className }: { className?: string }) {
  return (
    <div aria-hidden className={["prizes-atmos", className].filter(Boolean).join(" ")}>
      <div className="prizes-blob prizes-blob-a" />
      <div className="prizes-blob prizes-blob-b" />
      <div className="prizes-blob prizes-blob-c" />
      <div className="prizes-glow" />
      <div className="prizes-floor">
        <div className="prizes-floor-plane" />
      </div>
      <div className="prizes-scrim" />
      <div className="prizes-grain" />
    </div>
  );
}
