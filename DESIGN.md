# Design

<!-- impeccable:design-schema 1 -->

## Status

Partial, by deliberate scope. Only the **Spielmodus** (live-capture) view and its throw-entry modal carry the world described below — this was the agreed pilot surface. Dashboard, Kader, Spielanalyse, Spielplan, and Statistiken still run the prior dark, card-grid system (`:root` tokens in `css/style.css`, roughly GitHub-dark in character). That system is not documented here as an intentional world; it is the incumbent baseline the pilot deliberately did not touch, pending a decision on whether/how to extend the new world to the rest of the app.

## Direction (Spielmodus)

**World: Trainer-Taktiktafel** — the coach's own tactics board (chalkboard in dark mode, dry-erase whiteboard in light mode), the object already in a coach's hand during a timeout. Chosen as the deliberate, informed pick over a dice-assigned alternative (a scorer's-table/match-protocol world); logged as seed `b5fa38d0`, direction index 3, resolved kind `pick`. Build path: code-led (no comp).

**Thesis:** the live-capture screen reads as a physical board the coach is writing on, not a form or a SaaS dashboard — refusing the card-grid-plus-badges pattern the rest of the app (and the category) defaults to.

**Scope boundary:** the world lives entirely under two CSS scoping classes — `.tacboard` (the Spielmodus page) and `.modal-tacboard` (the throw-entry modal, added/removed alongside `modal-wide` in `openAttackModal`/`openDefenseModal`). No shared component, token, or other view was restyled; the court-drawing logic in `js/court.js` is untouched — the board reskins the shared court SVG via CSS only, since SVG presentation attributes have zero specificity and are overridden by any CSS rule.

## Palette & material

Two physical variants of the same object, driven by the existing `[data-theme]` toggle (not a new setting):

| Token | Dark (chalkboard) | Light (whiteboard) |
|---|---|---|
| `--tac-board` | `#14231c` | `#fbfaf4` |
| `--tac-board-soft` | `#1c2f26` | `#f1efe4` |
| `--tac-frame` (mount/bezel) | `#2b2015` (wood) | `#d3d7dc` (aluminum) |
| `--tac-frame-edge` | `#4a3623` | `#aab0b8` |
| `--tac-chalk` (ink) | `#f2efe3` (warm chalk white) | `#22282a` (graphite) |
| `--tac-chalk-dim` | `#b7c4bb` | `#5c666a` |

Outcome and team-identity colors are **not** new — they reuse the app-wide `--green` (own/goal), `--accent` (opponent/miss), `--yellow` (block), `--blue` (post) tokens, which are already theme-aware. This was a deliberate constraint: Spielanalyse's shot legend and Statistiken already teach the coach "green = us/goal, red = opponent/miss," and the board would have contradicted that if it introduced its own hues.

## Type

No new typeface. `--font-serif` (Newsreader, already vendored for headings app-wide) continues to carry the italic score/panel labels for continuity with the rest of the app. Numerals (score, timer) keep `font-variant-numeric: tabular-nums` and grew from 52px to 64px in the scoreboard — still well under a display ceiling, chosen because the board's first job is being readable at arm's length under gym lighting.

## Composition

- **Board + frame**: `.tacboard-frame` is the mounted bezel (wood dark / aluminum light) with an offset+blurred shadow (`--tac-shadow`); `.tacboard-board` inside it is the writing surface, with a fine chalk-dust radial-gradient texture at 13px pitch.
- **Scoreboard**: score numerals rotated -1° (hand-scrawled feel), soft glow via `text-shadow` in chalk mode only (no glow in whiteboard mode — chalk dusts, marker ink doesn't). Timer + halftime toggle render as a separate tag clipped to the board with a small circular "magnet" pseudo-element (`::before`) at its top edge.
- **Outcome buttons**: rendered as dashed-border "stamp" tiles, each at a slightly different fixed rotation (`nth-child` −1.2°/0.8°/−0.6°/1.3°) for a hand-placed feel; rotation resets to 0 and the border solidifies on hover/selection, so the tap target reads unambiguously.
- **Recent-entries list**: reframed as a pinned notepad (`.tacboard-notepad`, rotated −0.6°, a red "pin" dot), replacing the boxed-card list. The own/opponent glyphs are now authored inline SVG (an arrow and a shield outline) — the previous ⚡/🛡 emoji were removed per the craft floor's ban on emoji standing in for icons.
- **Throw-entry modal** (`.modal-tacboard`): court lines, zone wedges, player discs, goal-zone grid, and opponent-roster chips are all restyled to the board's ink/board-soft palette via scoped CSS; nothing in `court.js` changed, so Spielanalyse's court rendering is unaffected.

## Signature interaction & motion

**Magnet-snap**: selecting a zone, player disc, goal-zone cell, or opponent chip triggers a single `tacSnap` keyframe (scale 0.84 → 1, exponential ease-out `cubic-bezier(0.16,1,0.3,1)`, ~220ms) — a decisive settle, not a spring. An earlier draft used an overshoot/elastic curve; the project's detector flagged it as the generic "AI bounce" tell and it was removed in favor of this monotonic snap.

**Score pop**: when the score actually changes, the number gets a `chalkPop` scale-in (1.18 → 1, same ease, ~300ms) — re-triggered via classList remove/reflow/add so it replays on every change, not just the first.

**Chalk-dust burst**: exactly one celebratory moment — six small particles puff from the own-score number on an own goal only (`burstChalkDust()` in `js/views.js`, called from `openAttackModal`'s save handler). Deliberately not attached to every tap, so it never adds friction to live capture. Respects `prefers-reduced-motion` (all of the above animations are disabled under that media query).

## Accessibility notes carried into this world

- Focus rings and text selection inside `.tacboard`/`.modal-tacboard` are themed to the board's ink color rather than left as browser-default blue, per the craft floor's "browser surfaces" check.
- Outcome tiles and disc targets were sized up further under `@media (pointer: coarse)`, on top of the app's existing coarse-pointer rules — consistent with the confirmed iPad/courtside operating context in `PRODUCT.md`.
- Outcome color mapping is unchanged from the rest of the app (see Palette above), so colorblind users who've learned the existing green/red/yellow/blue meaning elsewhere in the app aren't taught a second mapping here.

## Known gap — disclose, don't hide

This build's finish review could not run its normal visual pass: no browser automation was available in this session, so no desktop/mobile screenshots were captured and no side-by-side inspection against this contract happened. The mechanical detector (`detect.mjs`) is clean on all changed files — its one finding (a `border-left` side-tab accent on the pre-existing `.toast-ok/.toast-err/.toast-inf` classes, outside the original Spielmodus scope) was fixed at the user's request rather than left as a known gap: toasts now distinguish type with a drawn icon (check/cross/i) instead of a colored side border. **Open item:** verify visually at `http://localhost:5500` (Kader → add a player, Spielplan → add an unplayed game, then Spielmodus) in both light and dark mode, and on a narrow/iPad-width viewport, before treating this as fully finished.

## Extending the world later

If/when the tactics-board world is extended past Spielmodus (per the original plan to pilot here first), reuse the `--tac-*` token names and the `.tacboard`/`.modal-tacboard` scoping pattern rather than inventing a second naming scheme, and keep the same constraint that outcome/team colors stay the app-wide `--green`/`--accent`/`--yellow`/`--blue`.
