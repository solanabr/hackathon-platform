# Colosseum 3D Hero — Design

**Date:** 2026-09-09
**Status:** approved (design), pending implementation plan
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

**Bays are spaced by equal arc length, not equal angle.** An ellipse divided
into 80 equal angular steps produces bays that visibly stretch at the ends of
the major axis — the single most common tell of an amateur Colosseum. The
generator builds a cumulative arc-length table over the ellipse parameter and
binary-searches it for each of the 80 stations, so bay width is constant and the
angular step varies. Same technique already used for the tone lookup in
`colosseum-backdrop.tsx` (`edges[]` + binary search).

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

```
src/components/home/colosseum/
  ellipse.ts        arc-length parametrisation, bay stations
  orders.ts         Tuscan / Ionic / Corinthian profiles, entablature bands
  rings.ts          ring 0–4 geometry builders, survivalLevel()
  hypogeum.ts       tunnel grid and shafts
  glyph-atlas.ts    base58 SDF atlas baking
  halftone.glsl.ts  the glyph post pass
  signatures.ts     generated — do not edit by hand
  scene.tsx         renderer, camera, motion, dispose on unmount
  index.tsx         dynamic boundary + fallback to ColosseumBackdrop
scripts/
  fetch-solana-signatures.ts
```

Each module is independently testable: `ellipse.ts` and `rings.ts` are pure
functions over numbers and belong in `src/lib/__tests__/`-style unit tests
(equal arc length within tolerance, survival levels monotonic around the
azimuth, bay count exactly 80).

## Build order

Four phases, each independently verifiable, each leaving the page shippable:

1. **Geometry, headless.** `ellipse.ts`, `orders.ts`, `rings.ts`, `hypogeum.ts`
   plus unit tests. Verified by tests and a throwaway wireframe view — no
   halftone, no page integration. This is the phase that decides whether the
   model is serious, so it is the one that gets reviewed hardest.
2. **Glyph halftone.** Atlas baking, the post pass, and A/B against the existing
   `ColosseumBackdrop` output: at hero scale the density field must be
   indistinguishable from the current SVG.
3. **Signatures.** Fetch script, generated module, keystone panels.
4. **Integration.** Hero layout change, dynamic boundary, fallback, motion
   tokens, bundle measurement.

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
