# Colosseum 3D Hero — Design

**Date:** 2026-09-09
**Status:** approved (design); rendering route revised 2026-09-09, see *Revision: baked
geometry* below
**Supersedes:** nothing. `colosseum-backdrop.tsx` is kept and repurposed as the poster/fallback.

## Goal

Replace the flat halftone amphitheatre behind the hero ticket with a real,
architecturally correct 3D model of the Colosseum whose stone surface is made of
live Solana mainnet transaction signatures — rendered through the same
ink-on-cream halftone language the rest of the landing page already speaks.

Two constraints pull against each other and the whole design is the resolution
of that tension:

1. The page is 1-bit. Every illustration on it comes out of `halftoneMarks()` in
   `src/components/home/halftone.ts` — horizontal strokes on a fixed grid, no
   gradients, no photography, no texture. A photoreal render would read as a
   foreign body.
2. The piece must have real volume, real perspective and real occlusion, and the
   base58 signatures must actually be readable, not decorative noise.

## The core problem, and the resolution

An 8px halftone cell and legible micro-typography cannot occupy the same pixel.
Texturing the stone with hashes and then dithering over it destroys the text —
this is why "hash-textured" work usually collapses into dirt.

So the hash is not *under* the halftone. **The hash is the halftone.**

`halftoneMarks()` today modulates the *length* of a stroke by tone:

```ts
const len = 0.4 + Math.pow(tone, 1.2) * (cellW - 0.5);
(tone > 0.7 ? dark : light).push(...)
```

The 3D piece keeps that grid and that curve, and swaps the mark: each cell emits
**one base58 character**, taken in sequence order, with its ink coverage
modulated by the same tone. Light tone → the glyph is drawn small and thin
inside its cell. Heavy tone → it fills the cell at full weight. Below the same
noise floor (`tone < 0.05 + rnd()*0.11`) nothing is drawn at all.

At viewing distance the density field is indistinguishable from the LP's
existing halftone. Up close, the field resolves and the facade reads as
uninterrupted mainnet signatures.

Crucially, glyph *choice* is never driven by density — it is driven by position
in the signature buffer, so sequences read left-to-right along the stone and
stay real. Only *weight* carries tone. This is what keeps it from degrading into
a character soup with the right average darkness.

### The historical hook

Rome numbered the Colosseum's arches I–LXXVI so a citizen could find their seat;
the four axial entrances were unnumbered. In this piece the signature replaces
the numeral on the keystone panel above each ground-level arch. The building
already indexed its entrances — now it indexes them with transactions. This is
the one place where the hash is displayed at full legibility rather than as
surface texture.

## Architectural specification

Every number below is the real monument. Nothing is eyeballed. Sources at the
end.

### Plan

| Property | Value |
| --- | --- |
| Outer ellipse | 187.75 m × 155.60 m (semi-axes a = 93.875, b = 77.80) |
| Standing height (north) | 48.5 m |
| Original height with attic | ~52 m |
| Arena floor | 83 m × 48 m |
| Arena incl. podium wall | 87 m × 55 m |
| Bays per level | 80 |

### Ellipse or oval — resolved, with the discrepancy recorded

The plan is often cited as a 527 m perimeter with 188 × 156 m axes, and the
literature disputes whether the Romans laid out a true ellipse, a four-centre
oval, or an eight-centre one. Those two published figures are **mutually
inconsistent** and this was verified numerically rather than assumed:

| Plan curve | Perimeter | Max deviation from the true ellipse |
| --- | --- | --- |
| True ellipse, a = 93.875, b = 77.80 | 540.52 m | — |
| Best-fitting four-centre oval (d = 30, r = 63.88, R = 103.15) | 537.89 m | 1.10 m |
| Four-centre oval, closest possible to 527 m | 529.07 m | 3.56 m (degenerate: 3.88 m corner arc) |

No architecturally sensible four-centre oval on these axes reaches 527 m. The
axes are far better attested than the perimeter figure, and the best-formed oval
sits 1.10 m from the true ellipse — under a pixel at hero scale.

**Decision: build on the true ellipse.** The oval question is recorded here so it
is a decision, not an oversight. If the silhouette ever needs the historical
layout, `ellipse.ts` swaps for a four-centre curve behind the same interface.

Corroboration that the parametrisation is sound: an equal-arc bay pitch of
6.756 m minus the documented 4.2 m arch leaves **2.556 m of pier**, which matches
the real pier thickness. The numbers close on themselves.

**Bays are spaced by equal arc length, not equal angle.** An ellipse divided
into 80 equal angular steps produces bays that visibly stretch at the ends of
the major axis — the single most common tell of an amateur Colosseum. Measured:
equal-angle spacing swings bay width from 6.11 m to 7.37 m, an **18.6% spread**,
with the widest bays landing on the major-axis ends. Equal arc length holds width
constant to within 0.03%.

The generator builds a cumulative arc-length table over the ellipse parameter
(Simpson over 200k sub-intervals) and binary-searches it for each of the 80
stations, so bay width is constant and the angular step varies. Same technique
already used for the tone lookup in `colosseum-backdrop.tsx` (`edges[]` + binary
search). A unit test asserts the spread stays under 0.1%.

### Elevation — four registers

| Register | Order | Treatment | Height |
| --- | --- | --- | --- |
| 1 | Tuscan | 80 arches, engaged half-columns on piers, opus quadratum | ~10.5 m |
| 2 | Ionic | 80 arches, engaged half-columns | ~11.85 m |
| 3 | Corinthian | 80 arches, engaged half-columns | ~11.6 m |
| 4 (attic) | Corinthian | solid wall, pilasters, square windows alternating with bronze shield panels (*clipei*) | ~13.2 m |

Those four register heights sum to ~47.15 m against a documented standing height
of 48.5 m; the ~1.3 m difference is the podium/stylobate course below register 1,
which the generator models explicitly rather than absorbing into the registers.

Ground arches are ~4.2 m wide × ~7.05 m high. Each arch is flanked by a pair of
engaged columns carrying an entablature, so the wall reads as a superimposed
lattice of arch-within-order, repeated eighty times. The entablature bands are
load-bearing to the *image*, not just the building: the existing 2D component
already notes that without the horizontal tie the facade degrades into a fence.

The attic carries **240 mast corbels** (*mensulae*) for the velarium rigging —
three per bay across the 80 bays. They are small, they are the top silhouette,
and they are the reason the roofline reads as the Colosseum and not as a generic
arcade.

### The ruin — modelled, not faked

The southern outer ring collapsed in the 1349 earthquake, having been founded on
softer alluvial soil; the north side stands to full height. Roughly 31 of the 80
ground-level arches survive intact.

The generator therefore takes a per-bay `survivalLevel(bayIndex) → 0..4`
function driven by the bay's true azimuth rather than a decorative break: full
four registers on the north, stepping down through 3 and 2, then to 0 on the
south, where the outer ring is gone entirely and the **second arcade ring**
stands exposed behind it. That exposed inner ring is what makes a Colosseum
read as *ruined* rather than *cropped*, and it is why the model needs more than
one concentric ring.

Both ends of the surviving stretch are closed by the 19th-century buttresses —
Stern's brick spur (1820, east) and Valadier's travertine one (1823–26, west).
They are almost never modelled and they are instantly recognisable.

### Rings, in build order

0. **Outer facade ring** — four registers as tabulated, per-bay survival.
1. **Second arcade ring** — annular corridor wall, exposed wherever ring 0 is gone.
2. **Cavea substructure** — radial walls and barrel vaults, the stepped seating
   long since lost, leaving the skeleton.
3. **Arena podium + floor plane** — partial, as today: a sectioned wooden floor
   over open ground.
4. **Hypogeum** — two levels of tunnels over 15,000 m², a central longitudinal
   corridor with radial chambers off it, and 30+ vertical shafts. Visible
   because the arena floor is only partly restored. Without it the model is a
   ring with a hole; with it, it is the Colosseum.

### Surface detail

- **Clamp holes.** 300 tons of iron clamps were quarried out of the travertine
  in the medieval period, leaving the pockmark field across the whole facade.
  This is the monument's most recognisable texture and it maps perfectly onto a
  halftone system: the holes are tone, and therefore they are glyph weight.
- Base58 excludes `0`, `O`, `I` and `l` — the atlas is 58 glyphs, not 62.

## Revision: baked geometry (2026-09-09)

Everything above stands as the design. What changed is where the geometry comes
from and when it is rendered. Two findings forced it, both measured.

### The geometry is an asset, not a generator

A Tripo-generated GLB of the monument (77 MB, 1.72M vertices, 1.87M triangles,
109 unnamed parts, one baked basecolor JPEG) was rasterised and inspected. It is
a real Colosseum, not an approximation of one: four registers, the intact north
facade, the collapsed south, the exposed second arcade ring, the cavea
substructure, and both 19th-century buttresses. That is rings 0–3 of the build
order, already modelled — including the convincing ruin, which is the single
hardest thing to generate procedurally.

What it does not carry:

- **No per-bay semantics.** 109 `tripo_part_*` blobs, no arch index. The keystone
  panels — the signature replacing the Roman numeral, the one place the hash is
  displayed at full legibility — have nothing to anchor to. That beat is deferred
  and will be redesigned rather than forced onto inferred positions.
- **It is not measured.** Plan aspect is 1.149 against the real 1.206; the ground
  arches read slightly pointed rather than semicircular; the 240 velarium corbels
  are absent. The equal-arc-length parametrisation, the 80-bay station table and
  `survivalLevel()` are consequently *not built* — the asset's own proportions
  are inherited. The arc-length analysis above is retained as the record of why
  equal-angle spacing is wrong, in case the geometry is ever regenerated.

### Tone comes from recess, not from shading

The first halftone pass over a diffuse-lit render dissolved into noise. Diffuse
luminance is the wrong tone source: it makes the facade a flat mid-grey field in
which pier and void are indistinguishable, which is exactly the "collapses into
dirt" failure this document set out to avoid.

The existing 2D component already encodes the right answer — `STONE = 0.26`,
`CORNICE = 0.62`, `VOID = 0.95`. **The arch void is the ink.** So the baker
derives tone from local depth discontinuity: how far a fragment sits behind the
nearest surface in a screen-space neighbourhood. A recess reads dark regardless
of how the key light happens to fall on it, and standing stone stays light.

Scan-mesh surface noise puts *every* fragment marginally behind its neighbourhood
minimum, so the recess term needs a dead zone (`RECESS_DEAD_ZONE`) or the stone
never resolves light and the whole facade saturates to black. This was the
difference between an unreadable slab and a legible arcade.

### Framing is part of the tone model

At whole-monument framing the arcade is under one 8px cell per arch and cannot
survive the halftone — 80 bays across 1600px is 20px per bay against `CELL = 8`.
The existing SVG already solved this by showing only `BAYS = 21`. The bake uses
the same discipline: a cropped stretch of facade, camera near facade level
(`elevation: 0.045`). A higher camera looks into the ruined bowl, and the
interior renders as an unreadable black mass.

The composition change in the section above — the piece taking the ticket's slot
in the right column — is therefore **deferred**. The bake targets the existing
backdrop slot (`COLS = 200`, `ROWS = 78`, `CELL = 8`) so it is a drop-in
replacement for the static `TONES` array, and ships without touching hero layout.

### No mesh reaches the browser

Since the motion is a slow orbit of a few degrees, the model does not need to be
in the bundle at all. `scripts/bake-colosseum.mjs` rasterises N azimuths at build
time and emits `src/components/home/colosseum/tones.generated.ts` — the same
base36 tone strings `halftoneMarks()` already consumes.

This replaces the entire Three.js pipeline described in the next section:

| | Runtime WebGL | Baked |
| --- | --- | --- |
| Bundle | Three.js subset + decimated mesh (~2 MB) | tone strings only |
| Renderer | WebGL, desktop only | SVG, everywhere |
| Fallback | separate poster path | none needed — it *is* the SVG |
| Motion | free orbit + pointer parallax | discrete frames along a fixed arc |

The cost is that camera angles are fixed at build time: pointer parallax becomes
a lookup into the baked arc rather than a free camera. Everything else is won.

The GLB stays out of the repository — the baker takes its path as an argument.

The pipeline described below is retained as the record of the rejected route and
as the reference if free-camera motion is ever needed.

## Rendering pipeline

**Approach: Three.js + a glyph-halftone post pass.** The alternative considered
was extending the existing hand-written rasteriser to 3D with no new dependency;
it was rejected because depth-correct occlusion between the outer and inner
rings is exactly what sells the ruin, and a painter's-algorithm rasteriser does
that badly. The dependency buys the one thing the piece cannot fake.

1. **Geometry** — generated in TypeScript from the constants above into
   `BufferGeometry`. Repeated elements (piers, engaged columns, corbels,
   voussoirs, hypogeum walls) are `InstancedMesh` with per-instance matrices.
2. **Lighting** — single directional key plus ambient, flat linear output. No
   tone mapping, no sRGB conversion on the render target: the shader quantises
   luminance itself, so any gamma applied before that pass would skew the tone
   ramp against the 2D halftone.
3. **Luminance target** — scene renders to a `WebGLRenderTarget`.
4. **Glyph pass** — fullscreen shader. Per 8px screen cell (matching `CELL = 8`):
   sample luminance → derive `tone` → index the signature buffer by cell
   coordinate → sample the SDF glyph atlas at cell-local UV → threshold by tone,
   with the `tone > 0.7` split reproducing the existing light/dark stroke
   weights (1.6 / 3.0).
5. **Output** — ink `#1b231d` on `--color-surface`, straight from the theme
   tokens. No new colour enters the palette.

### Signature sourcing

A build-time script fetches real mainnet signatures and freezes them into a
generated `.ts` module. No RPC call at runtime, no client-side dependency, no
network on the critical path. The script is re-runnable to refresh the set.

### Composition

The piece becomes the protagonist of the hero's right column, taking the slot the
ticket holds today. The ticket moves to a full-width strip anchored at the bottom
of the fold, spanning both grid columns beneath the copy and the model — it keeps
its current sticker treatment and its content unchanged, only its position and
aspect change. The absolute bottom-right backdrop slot in
`src/app/(public)/page.tsx` is retired. On `< lg` the layout is unchanged from
today except that the backdrop stays SVG.

### Performance and fallback

- Loaded via `next/dynamic` with `ssr: false`, after LCP, desktop breakpoints only.
- `ColosseumBackdrop` (the existing SVG) renders immediately as the poster and
  remains the permanent fallback for mobile, `prefers-reduced-motion`, and
  no-WebGL. Nothing already built is discarded.
- Motion — a slow orbit of a few degrees plus camera parallax on pointer — uses
  the tokens in `src/styles/tokens/motion.css` (`--ease-inout`), never raw
  values. Reduced motion resolves to a single static frame, per `docs/MOTION.md`.
- Budget: the Three.js subset must be measured on the real build before merge,
  not assumed. If it lands materially above ~140 kB gzip, the loading strategy
  gets revisited before the feature does.

## Module layout

Superseded by the baked route:

```
src/components/home/colosseum/
  tones.generated.ts   generated — do not edit by hand
  signatures.ts        generated — do not edit by hand
  index.tsx            frame selection, motion, marks
scripts/
  bake-colosseum.mjs
  fetch-solana-signatures.ts
```

Each module is independently testable: `ellipse.ts` and `rings.ts` are pure
functions over numbers and belong in `src/lib/__tests__/`-style unit tests
(equal arc length within tolerance, survival levels monotonic around the
azimuth, bay count exactly 80).

## Build order

Four phases, each independently verifiable, each leaving the page shippable:

1. ~~**Geometry, headless.**~~ Delivered by the GLB — see *Revision* above.
2. **Bake.** `scripts/bake-colosseum.mjs`: rasteriser, recess tone model, framing,
   generated tone module. Verified by preview renders and by A/B against the
   existing `ColosseumBackdrop` output at the same slot dimensions.
3. **Marks.** The glyph variant of `halftoneMarks()` — one base58 character per
   cell, weight modulated by tone, glyph choice driven by signature position and
   never by density.
4. **Signatures.** Fetch script and generated module.
5. **Integration.** Swap the static `TONES` for the baked frames, wire the orbit
   to the motion tokens, reduced motion resolves to a single frame.

## Out of scope

- Interior seating reconstruction (the cavea is a ruin; it stays a ruin).
- Any change to hero copy, CTAs or tracking.
- Mobile 3D. Mobile keeps the SVG.

## Sources

- [Colosseum dimensions](https://colosseum.info/dimensions/)
- [Architecture of the Colosseum — Colosseo-Roma](https://colosseo-roma.it/en/explore/coliseum/architecture/)
- [Description — the-colosseum.net](https://the-colosseum.net/wp/en/description/)
- [Colosseum architecture — thecolosseum.org](https://www.thecolosseum.org/architecture/)
- [Roman Coliseum data and plans — WikiArquitectura](https://en.wikiarquitectura.com/building/roman-coliseum/)
- [Roman numerals on the arches](https://all-about-roman-numerals.com/roman-numerals-lesson-the-colosseum/)
- [Collapse, soil and restoration](https://www.romevisitpass.com/rome-travel-guide/what-happened-to-the-colosseum-why-it-is-broken-and-the-history-of-its-restoration/)
- [Hypogeum](https://www.througheternity.com/rome/colosseum-underground-a-history)
- [Ellipse? — the-colosseum.net](https://the-colosseum.net/wp/en/ellipse/)
- [Ovals with 4n centres: the ground plan of the Colosseum](https://link.springer.com/chapter/10.1007/978-3-030-28810-5_8)
- [Rosin & Trucco, *The Amphitheatre Construction Problem*](https://the-colosseum.net/docs/Rosin%20-%20Trucco%20-%20The%20Amphitheatre%20Construction%20Problem.pdf)

Plan-curve figures in this document were computed, not quoted; the scripts live
in the session scratchpad and are reproduced by the phase-1 unit tests.
