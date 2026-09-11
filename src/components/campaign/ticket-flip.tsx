"use client";

import { useEffect, useRef } from "react";
import {
  TicketFront,
  TicketBack,
  type TicketFact,
} from "@/components/campaign/event-ticket";

/* ---------------------------------------------------------------------------
 * THE TICKET FLIPS
 *
 * One piece, two faces, that leaves the corner of the first fold and goes to
 * PARK in the next section — flipped, back side up. The back is the section's
 * content. This is not a transition between two similar objects: it is the
 * same object, and that is what the scroll has to prove.
 *
 * WHERE THE PIECE LIVES. At the destination, not the origin. It is a child of
 * the "O que é o Colosseum" section and its rest is the PARKED state — back
 * showing, in place, in normal flow. The hero corner is the transformed state,
 * and the anchor says where that corner is: the single-face copy that stays in
 * the hero occupying the box (invisible while the flight is active). So the
 * landing is exact by construction, instead of a `translate` in `vh` tuned by
 * eye that misses at every window height other than the one it was tuned on.
 *
 * WHAT THIS COMPONENT DOES. Measure, only. It reads the two boxes, writes four
 * numbers into custom properties and gets out of the way — the whole animation
 * is `animation-timeline` on the compositor (styles/bilhete.css). No scroll
 * listener here: measuring is a layout concern, and layout changes when the
 * window changes, not on every scroll frame.
 *
 * `--bu` CLOSES THE LOOP. The ticket's internal unit is the ratio between the
 * two widths, and the flight's scale is that same ratio inverted. So the
 * parked piece is truly large — perforation, hole and type all at the large
 * scale — and in the hero corner it shrinks to exactly the approved drawing of
 * the first fold. One calculation governs both ends.
 * ------------------------------------------------------------------------- */

const round3 = (v: number) => Math.round(v * 1000) / 1000;

export function TicketFlip({
  facts,
  note,
}: {
  facts: readonly TicketFact[];
  note?: string;
}) {
  const gap = useRef<HTMLDivElement>(null);
  const flight = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      const box = gap.current;
      const piece = flight.current;
      const anchor = document.getElementById("bilhete-ancora");
      if (!box || !piece || !anchor) return;

      const rc = box.getBoundingClientRect();
      const ra = anchor.getBoundingClientRect();
      if (rc.width < 1 || ra.width < 1) return;

      /* The unit first, because it changes the piece's HEIGHT — and height
         feeds the offset. Measuring everything at once would give a `dy`
         computed against the old box, and the card would land a few px off. */
      const bu = round3(rc.width / ra.width);
      piece.style.setProperty("--bu", String(bu));
      piece.style.setProperty("--voo-k", String(round3(1 / bu)));

      /* Second pass, with the box at its new size: the vector between the two
         CENTERS. Center and not corner because the flight's spin and scale
         originate at the center; by corner the piece would land half a box off. */
      requestAnimationFrame(() => {
        const c2 = gap.current?.getBoundingClientRect();
        const a2 = document
          .getElementById("bilhete-ancora")
          ?.getBoundingClientRect();
        if (!c2 || !a2 || !flight.current) return;

        const dx = a2.left + a2.width / 2 - (c2.left + c2.width / 2);
        const dy = a2.top + a2.height / 2 - (c2.top + c2.height / 2);
        flight.current.style.setProperty("--voo-dx", `${Math.round(dx)}px`);
        flight.current.style.setProperty("--voo-dy", `${Math.round(dy)}px`);

        /* THE TRAVEL. How much scroll until it parks. The end is the instant
           the destination box reaches a quarter of the window — high enough
           for the piece to land inside the frame, not glued to the bottom
           edge. The floor exists for very tall screens, where the math would
           give too short a travel and the flip would become a snap. */
        const target = c2.top + window.scrollY;
        const travel = Math.max(
          360,
          Math.round(target - window.innerHeight * 0.24),
        );
        flight.current.style.setProperty("--voo-curso", `${travel}px`);
      });
    };

    measure();

    const ro = new ResizeObserver(measure);
    if (gap.current) ro.observe(gap.current);
    const anchor = document.getElementById("bilhete-ancora");
    if (anchor) ro.observe(anchor);
    window.addEventListener("resize", measure);
    /* Font swaps change the height of both boxes. Without this the first
       landing is measured in Times New Roman. */
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={gap} className="bilhete-vao">
      <div ref={flight} className="bilhete-voo">
        <div className="bilhete-face bilhete-face-frente">
          <div aria-hidden className="bilhete-espessura ticket-cut" />
          <TicketFront />
        </div>
        <div className="bilhete-face bilhete-face-verso">
          <div aria-hidden className="bilhete-espessura ticket-cut" />
          <TicketBack facts={facts} note={note} />
        </div>
      </div>
    </div>
  );
}
