/* THE PRIZES ATMOSPHERE — the air around the podium.
 *
 * Four layers and a veil, in the order the light arrives: the aurora moves
 * behind everything, the glow breathes on the horizon, the mesh funnel drops
 * and closes behind the podium base, its throat lights up and the paper grain
 * closes over the top. The cream veil is what keeps the text reading over the
 * colour — without it the bottom band loses contrast on `muted`.
 *
 * Nothing here measures, takes clicks or enters the reading order: the
 * drawing lives entirely in CSS (`.prizes-*` in globals.css) and the section
 * only hosts it. */
export function PrizesAtmosphere({ className }: { className?: string }) {
  return (
    <div aria-hidden className={["prizes-atmos", className].filter(Boolean).join(" ")}>
      <div className="prizes-blob prizes-blob-a" />
      <div className="prizes-blob prizes-blob-b" />
      <div className="prizes-blob prizes-blob-c" />
      <div className="prizes-glow" />
      <div className="prizes-funnel">
        <div className="prizes-funnel-plane" />
      </div>
      <div className="prizes-vertex" />
      <div className="prizes-scrim" />
      <div className="prizes-grain" />
    </div>
  );
}
