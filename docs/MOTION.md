# Motion Tokens

The Design System's motion layer, in `src/styles/tokens/motion.css`
(imported by `src/app/globals.css`). Color, typography and spacing were already
tokens; easing, duration and stagger were not — and that is where mediocre
motion creeps in on its own, because without a token the browser default wins.

**Hard rule: no loose timing or curve value in the code.** If you wrote a
number of ms, a `cubic-bezier` or an `ease-out`, it is wrong.

## Curves

Registered in `@theme`, so they become Tailwind utilities (`ease-entrada`, …).

| Token | Value | When |
|---|---|---|
| `ease-entrada` | `cubic-bezier(0.16, 1, 0.28, 1)` | reveal of text, section, image; color and focus changes |
| `ease-saida` | `cubic-bezier(0.7, 0, 0.84, 0)` | element leaving the scene |
| `ease-inout` | `cubic-bezier(0.76, 0, 0.24, 1)` | loops, long hover, camera, image zoom, toggle |
| `ease-carimbo` | `cubic-bezier(0.2, 1.32, 0.36, 1)` | a **paper object** settling: card, ticket, seal, badge, panel |
| `ease-mola` | `cubic-bezier(0.34, 1.24, 0.64, 1)` | lift/shift on hover |

The brand is stamped typography. Paper does not float, paper is **set down**:
hence the fast attack and long tail, and only physical objects overshoot —
typography never passes its mark.

## Duration

Custom properties on `:root`. Use `duration-(--dur-media)` (Tailwind v4 syntax).

| Token | Value | When |
|---|---|---|
| `--dur-toque` | `0.13s` | `:active`, tap confirmation |
| `--dur-instant` | `0.19s` | color hover, focus, state change |
| `--dur-rapida` | `0.37s` | micro-interaction **with** displacement |
| `--dur-media` | `0.82s` | section reveal |
| `--dur-lenta` | `1.25s` | hero, narrative transition |

Each step is ~2x the previous one, and the values are deliberately non-round:
`200/400/600` is the signature of someone who measured nothing. The point of
the scale is that a **time hierarchy** exists — a site where everything lasts
the same has no rhythm, it has a metronome.

## Stagger and distance

`--stagger-texto` `0.065s` · `--stagger-lista` `0.11s` · `--stagger-tile` `0.045s`
`--dist-curta` `12px` · `--dist-entrada` `26px` · `--dist-longa` `44px`
`--tilt-papel` `1.4deg`

Distance is hierarchy: what comes from farther away is what the section wants
you to look at.

## Scene drift and zoom

`--deriva-curta` `3%` · `--deriva-media` `7%` · `--deriva-longa` `13%` · `--zoom-cena` `1.09`

The entrance distance applied along the scroll axis. Same rule as the steps:
what travels more is what sits deeper in the scene. In **%** of the layer
itself, not px — an absolute value becomes a jump on a phone and vanishes on a
27" monitor.

## The four motion layers

| Layer | Where | What triggers it |
|---|---|---|
| entrance | `.reveal`, `.hero-print`, `.press-sheet` | an observer, once |
| ambient | `.prizes-*`, `.bento-pulse` | nobody — it is the background breathing |
| **scroll** | `src/styles/scroll.css` | the scroll position |
| **finger** | `src/styles/interactions.css` | hover, active, focus |

### Scroll (`src/styles/scroll.css`)

Everything is `animation-timeline`, never a new listener. It is reversible for
free, runs on the compositor and, where the API does not exist, the `@supports`
block is skipped and the layer stays at rest — which is the approved design.

| Class | What it does |
|---|---|
| `cena-deriva-{curta,media,longa}` | background-layer parallax (`+ cena-deriva-contra` inverts it) |
| `cena-zoom` | a layer that fills the frame and recedes as you cross it |
| `cena-trilhos` | the `SectionRails` rails being traced |
| `cena-dobra` | the hero receding as it hands over the page |
| `cena-carta` | the card staircase fanning open (`--carta-i` at the call site) |
| `cena-assenta` | a large panel being pressed against the table |
| `chrome-assenta` / `lp-regua` | the header and the progress ruler |

**Hard rule: scroll scenes move background layers.** Text and CTAs do not
drift — the content is the still thing everything else moves relative to.

**Gotcha:** `view()` measures against the nearest scrollport, and `overflow: hidden`
**is** a scrollport. A section hosting a scene uses `overflow-clip`.

### Finger (`src/styles/interactions.css`)

Paper has weight: nothing floats, nothing pulses. Things lift a hair on hover
(`--ease-mola`) and **thump** on tap (`--dur-toque`) — the confirmation lands
before the action's result. Displacement sits behind `@media (hover: hover)`,
otherwise `:hover` sticks after a tap.

### Page transitions (`src/styles/rota.css`)

`src/app/(public)/template.tsx` remounts on every route, so the press sheet
peels off again: the same gesture as the first frame, pulled downward,
releasing the top first. Server Component — the transition costs zero bytes of JS.

## How to use it in reveal

`<Reveal>` (`src/components/ui/reveal.tsx`) no longer takes a `delay` in ms.
It takes `index` (the position within its family — the interval comes from the
token) and `tone`:

| `tone` | For |
|---|---|
| `texto` | lines of text: travels little, enters tight |
| `objeto` | default: a block of content |
| `papel` | card, ticket, seal — enters stamped |
| `longe` | what the section wants you to look at |

```tsx
{stats.map((s, i) => (
  <Reveal key={s.value} index={i + 1} tone="papel">…</Reveal>
))}
```

Anything animating in JS reads the token via `readMotionSeconds()` from
`src/lib/motion.ts` — JS animation cannot have its own time scale, or the two
layers diverge under reduced motion.

## Reduced motion

**It is not a switch.** What causes vestibular discomfort is displacement,
rotation and scale — not opacity. Under `prefers-reduced-motion`, the distance
tokens go to zero, the overshoot curves flatten and the time scale shrinks
proportionally. The whole orchestration continues: the order, the stagger, the
time hierarchy. The person still sees the page assemble in the order the
content asks for; they just are not dragged along.

Only the infinite decorative loops stop for good — they have no final state to
converge to.

## Gate

- [ ] `grep -rnE 'duration-[0-9]|duration-\[|cubic-bezier|\bease-(out|in|linear|in-out)\b' src` comes back empty (outside `styles/tokens`; `linear` on an `animation-timeline` is the right curve — the curve there is the scroll itself).
- [ ] Not everything has the same duration — a time hierarchy exists.
- [ ] Every craft transition has an explicit `ease-*` token utility.
- [ ] Reduced motion is a designed version, not animation switched off.
- [ ] Scroll scenes only on background layers, and the hosting section uses `overflow-clip`.
- [ ] Every clickable target has `:hover` **and** `:active`.
