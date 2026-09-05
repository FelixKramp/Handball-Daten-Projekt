# Design

<!-- impeccable:design-schema 1 -->

## Status

Partial, by deliberate scope. Only the **Spielmodus** (live-capture) view and its throw-entry modal carry the world described below — this remains the agreed pilot surface. Dashboard, Kader, Spielanalyse, Spielplan, and Statistiken still run the prior dark, card-grid system (`:root` tokens in `css/style.css`, roughly GitHub-dark in character). That system is not documented here as an intentional world; it is the incumbent baseline the pilot deliberately did not touch, pending a decision on whether/how to extend the new world to the rest of the app.

## Direction (Spielmodus)

**World: Digitaler Spielbericht** — the official match-report/scorer's-table protocol, redrawn clean and digital rather than photographed as paper. This replaces the project's first pilot world, a chalkboard/whiteboard "Trainer-Taktiktafel," which shipped, was visually verified, then rejected by the user on review: it read as the old dashboard with a green filter over it — a material swap, not a structural rethink — and its hand-drawn/rotated motifs felt too flashy and distracting for a Dritte-Liga-level tool whose only real job is fast, trustworthy data entry.

This "Spielbericht" world is not new to the project's history: it was the direction originally dice-assigned by the concept-seed roll for this surface (seed `b5fa38d0`, index 3) and declined at the time in favor of the chalkboard (logged as `MY PICK`). It is being built now because the user, walking through the full candidate set again after rejecting the chalkboard, converged on it directly in conversation — chosen for fit, not re-rolled. Build path: code-led (no comp).

**Thesis:** the live-capture screen reads as the protocol at the scorer's table — a ruled form, ticked boxes, a numbered event log — not a form pretending to be a physical board and not a card-grid dashboard. Restraint is the point, not a compromise: the brief was explicit that this must be functional first, distinctive second, never the reverse.

**Scope boundary:** unchanged in kind from the prior world — the world lives entirely under two CSS scoping classes, now renamed `.matchform` (the Spielmodus page) and `.modal-matchform` (the throw-entry modal, added/removed alongside `modal-wide` in `openAttackModal`/`openDefenseModal`). No shared component, token, or other view was restyled; `js/court.js` is untouched — the court SVG is reskinned via CSS only, since SVG presentation attributes have zero specificity and are overridden by any CSS rule.

## Palette & material

Two neutral variants of the same sheet, driven by the existing `[data-theme]` toggle (not a new setting) — deliberately *not* the chalk-green/parchment-cream palette of the previous world, to read as a plain document rather than a costume:

| Token | Dark | Light |
|---|---|---|
| `--form-sheet` | `#16181c` | `#ffffff` |
| `--form-sheet-alt` (zebra/boxed fields) | `#1e2126` | `#f4f5f7` |
| `--form-rule` (hairlines) | `#3a3f47` | `#d7dade` |
| `--form-rule-strong` (double-rule, box borders) | `#565d67` | `#9aa1ab` |
| `--form-ink` | `#eef0f2` | `#1c1f23` |
| `--form-ink-dim` | `#9aa1ab` | `#6b7280` |

Outcome and team-identity colors are unchanged from the prior world and from the rest of the app — `--green` (own/goal), `--accent` (opponent/miss), `--yellow` (block), `--blue` (post) — since Spielanalyse and Statistiken already teach the coach this mapping and a new world is not grounds to relearn it.

## Type

No new typeface, matching the Operate-mode guidance that a workhorse system stack outranks a decorative face here. `--font-serif` (Newsreader) is **not** used inside `.matchform` — the italic hand-labels were a chalkboard-specific choice; form-field labels are plain small-caps sans (10px, 700 weight, 0.08em tracking), the same pattern the rest of the app already uses for stat-card labels, which ties this world back to the base app's own vocabulary instead of inventing a second one. Numerals keep `font-variant-numeric: tabular-nums`; the scoreboard sits at 58px desktop / 44px narrow — legible at arm's length without claiming display-type scale.

## Composition

- **Sheet**: `.matchform-sheet` is a single bordered, softly shadowed rectangle (`--form-shadow`, offset+blur, no bezel/frame metaphor — a form has a border, not a mount). `.matchform-body` is plain padding, no texture.
- **Masthead**: the game-select field sits under a `border-bottom: 4px double var(--form-rule-strong)` — a genuine CSS double rule, no extra markup — echoing a letterhead's rule under a form's header block.
- **Scoreboard & timer**: ruled section (`border-bottom: 1px solid`), no rotation, no glow, no "magnet" tag — the timer renders as a plain bordered field box.
- **Outcome buttons**: ruled rectangular cells (not dashed, not rotated) with a small drawn checkbox square (`::before`, 13×13px, `border: 1.5px solid currentColor`) — recording an outcome now visually *is* ticking a box, dramatizing the actual mechanism instead of decorating around it. Unselected buttons show an outlined box; selected states (in the modal) fill the box solid with `currentColor`.
- **Event log**: `.matchform-log` replaces the pinned-notepad metaphor with a numbered, zebra-striped table (`nth-child(even)` tinting, hairline row dividers, a right-aligned running index via `.ri-num`) — rows are numbered because a protocol counts entries, not because a template wanted a kicker. The own/opponent glyphs stay the authored inline SVG arrow/shield from the prior world (still correct here, still not emoji).
- **Throw-entry modal** (`.modal-matchform`): court lines, zone wedges, player chips (now rectangular form-field cells, matching the goal-zone grid's own shape instead of a chalk-disc circle), goal-zone grid, and opponent-roster chips are restyled to the sheet's ink/rule palette via scoped CSS; `court.js` is unaffected.

## Signature interaction & motion

**Form-stamp**: one authored keyframe (`formStamp`, scale 0.9 → 1 with opacity 0.7 → 1, exponential ease-out `cubic-bezier(0.16,1,0.3,1)`, ~150–180ms) reused everywhere something registers as recorded — the score numeral on change, a checkbox's fill on selection in the modal, a zone/player/goal-zone/opponent chip on selection. One grammar, multiple triggers, rather than the prior world's two separate effects (a snap *and* a particle burst); the chalk-dust celebration was dropped rather than re-skinned; a paper form doesn't shed material. Respects `prefers-reduced-motion` (disabled under that media query, same as before).

## Accessibility notes carried into this world

- Focus rings and text selection inside `.matchform`/`.modal-matchform` are themed to the sheet's ink color rather than left as browser-default blue.
- Outcome tiles and player-cell targets keep the app's `@media (pointer: coarse)` sizing bump, consistent with the confirmed iPad/courtside operating context in `PRODUCT.md`.
- Outcome color mapping is unchanged app-wide, so colorblind users who've learned the existing green/red/yellow/blue meaning elsewhere aren't taught a second mapping here.

## Visual verification (closed)

Verified interactively at `http://localhost:5500` in both light and dark mode, at desktop (1280px) and iPad (768px) widths, covering the Spielmodus sheet and the throw-entry modal: masthead double-rule, ruled scoreboard/timer fields, checkbox outcome tiles (default and selected/filled), the numbered zebra-striped protocol log after a live save (score increment, new row, toast), and the court/goal-zone/player-cell grid inside the modal in both themes. The mechanical detector (`detect.mjs`) is clean on all changed files (`css/style.css`, `index.html`, `js/app.js`, `js/views.js`).

**Disclosed substitution:** this build's finish review and this document were produced in-thread by the same session that built the world, not by the shipped `impeccable-finish-reviewer`/`impeccable-documenter` subagents. Reason: those agents require real screenshot files on disk, and this session's browser tool returns screenshots inline rather than as file paths, with no in-session path to export them — passing no screenshots to the reviewer would mean it audits nothing. The visual checks above were run directly against the live app instead, including interaction and save-flow states a static screenshot pipeline would not have exercised. Nothing here should be read as a skipped review, but a fresh pair of eyes (a real subagent pass, or the user's own look) has not happened yet.

## Drei Arten von Information — und wohin Neues gehört

Die Erfassung wächst mit jedem Spiel um Wünsche: Tempogegenstoß, technische
Fehler, Überzahl, Siebenmeter-Quote. Wer jeden davon als weiteren Knopf in
die Ergebnisreihe legt, hat nach fünf Runden ein Formular, das im Spiel
niemand mehr bedienen kann. Deshalb sortiert sich alles Neue in genau eine
von drei Schubladen — und die Schublade bestimmt die Bedienung.

**1. Ergebnis — genau eines, immer nötig.**
Tor, Fehlschuss, Geblockt, Pfosten. Eine Knopfreihe, gegenseitig
ausschließend, gezeichnet als Kästchen im Formular-Stil. *Diese Reihe wächst
nicht.* Sie ist die Frage „was ist aus dem Wurf geworden", und darauf gibt es
keine sechste Antwort.

**2. Merkmal — beliebig viele, immer freiwillig.**
Beschreibt, *wie* der Wurf zustande kam: Tempogegenstoß, später vielleicht
Überzahl oder Konter. Additiv, also Kästchen zum Ankreuzen, nie ein
Ergebnis-Knopf. Technisch ein `tags`-Array am Wurf und ein Eintrag in
`App.data.SHOT_TAGS` — Formular, Protokoll und Analyse lesen aus dieser
Liste, angefasst werden muss dafür nichts. Ein neues Merkmal kostet eine
Zeile und ändert an alten Daten nichts, weil ein fehlendes Array wie ein
leeres gelesen wird.

**3. Ereignis ohne Wurf — eigener Knopf, eigene Maske, eigener Speicher.**
Ein technischer Fehler hat keinen Wurfort, kein Ergebnis, keine Torzone. Als
Wurf geführt würde er jede Trefferquote verfälschen: er erhöht den Nenner,
ohne je ein Tor werden zu können. Solche Ereignisse liegen deshalb in einem
eigenen Array (`turnovers`) mit eigenem Zähler, hängen im Schnellzugriff
unter der Ergebnisreihe an einem gestrichelten Knopf und öffnen eine kurze
eigene Maske. Zeitstrafen, Auszeiten oder Ballgewinne gehören später in
dieselbe Schublade.

**Woran man die Schublade erkennt:** Schließt es andere Antworten aus und
muss immer beantwortet werden? → Ergebnis. Kann es zutreffen oder nicht,
während der Wurf trotzdem vollständig ist? → Merkmal. Gibt es gar keinen
Wurf? → Ereignis.

**Sichtbare Folge im Formular:** Kästchen heißt „mehrere möglich", Kreis
heißt „genau eines" — die Unterscheidung, die jedes Papierformular auch
macht. Ausgefüllt wird das Zeichen selbst, nie nur ein Rahmen eingefärbt;
Bedeutung hängt hier nirgends allein an einer Farbe.

**Migration:** Jedes neue Feld braucht einen Eintrag in `migriere()` in
`data.js`. Die Funktion läuft beim Laden *und* beim Wiederherstellen einer
Sicherung — eine ältere Sicherung bringt den neuen Zähler sonst nicht mit,
und `nextId` liefert `NaN`.

## Extending the world later

If/when this world is extended past Spielmodus, reuse the `--form-*` token names and the `.matchform`/`.modal-matchform` scoping pattern rather than inventing a second naming scheme, and keep the same constraint that outcome/team colors stay the app-wide `--green`/`--accent`/`--yellow`/`--blue`.
