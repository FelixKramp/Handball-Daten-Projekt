# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user today: the coach of TSV Altenholz (Regionalliga M), using the app himself as coach/analyst for his own team. The app is built with the intent that other coaches/teams could eventually use it too, but no multi-tenant or multi-team support exists yet — it is currently single-team, single-user, browser-local.

## Product Purpose

A handball team dashboard that lets a coach capture what happens during a live game (throws with real court/goal position, opponent roster, live score) fast enough to keep up with play, then turns that captured data into an analysis a coach can actually use inside the game — at halftime or during a timeout — to see the team's current biggest weakness and adjust tactics for the next segment. Squad management, schedule (with optional OpenLigaDB sync), and season statistics support that same loop outside live play.

## Positioning

The mechanism a spreadsheet or paper stat sheet can't copy: real spatial throw data (actual tap position on court zones and goal/"Torwand" grid, not just a tally) captured at live-game speed, surfaced back as fast, actionable in-game analysis (e.g., "where is our weak point right now") rather than only a post-game report. Precision of capture and speed of capture are treated as equally load-bearing — neither can be sacrificed for the other.

Longer-term, explicitly future (not a current requirement): automating the data *capture* itself (e.g. video/camera-based tracking), not just automating the analysis/report generation. Today capture is manual, live, by the coach or a helper during the game.

## Operating Context

- Used courtside, live, during real handball games and training — git history shows dedicated iPad-optimization and quick-entry work, confirming tablet use under game-speed time pressure as a real constraint, not a nice-to-have.
- Used again at halftime and during timeouts to pull an at-a-glance read on team weaknesses.
- Single browser, single device per team: all data lives in `localStorage` only. There is no backend/server persistence — the only durability mechanism is a manual "Sicherung" (backup) JSON export/import the user is expected to do regularly. Any redesign must keep this backup/restore path visible and trustworthy, since losing it risks real data loss.
- Optional external data source: OpenLigaDB REST API for pulling the official schedule/results for a configured league + team ID (Regionalliga M / TSV Altenholz today); this is read-only schedule import, not the live-tracking data.

## Capabilities and Constraints

- Views: Dashboard, Live/"Spielmodus" (in-game capture), Kader (squad/roster), Spielanalyse (analysis), Spielplan (schedule), Statistiken (season stats).
- Live capture records real court throw position and goal-zone ("Torwand") position per throw, per player, plus opponent roster and live goals-against count.
- Data model (localStorage, `js/data.js`): `players[]`, `games[]` with per-game throws, opponent roster, live score and half tracking; JSON export/import for backup. Game minutes run continuously (2nd half starts at minute 31), so every throw can be placed in a half.
- Spielanalyse covers running games, not only finished ones, and can be narrowed to one half — the halftime/timeout read is a first-class path, not a post-game afterthought.
- Interface language is German; UI copy and terminology (Kader, Spielplan, Spielanalyse, Wurfzonen, Torwand, Sicherung) are established product vocabulary, not incidental — preserve unless the user changes them.
- Undecided: whether/how multi-team or multi-user support will work if the tool is ever used by other coaches; whether automated (non-manual) data capture is pursued and how.

## Brand Commitments

- Real club: TSV Altenholz, competing in Regionalliga M (men's regional league). "Mein Team" / "2025/26" in the current UI are placeholder team-name/season fields meant to be configured per team, not hardcoded — TSV Altenholz is the first real team this is configured for, not necessarily the only one the product name should imply.
- No existing logo, color, or typographic identity was described as binding beyond what's already implemented (Newsreader serif for headings, light/dark mode). Treat current visual implementation as incumbent system, not yet confirmed as a deliberate brand.

## Evidence on Hand

- Live codebase at this path (`index.html`, `css/`, `js/`) is the incumbent, working implementation — treat it as real product truth for scope/features, separate from its visual system.
- No PRODUCT.md or DESIGN.md existed before this file.
- No case studies, press, testimonials, or pricing exist or should be implied — this is an internal coaching tool, not a marketed product today.

## Product Principles

1. Live-game capture speed and spatial precision are co-equal; a change that speeds up entry by degrading position accuracy (or vice versa) is a regression, not a trade worth making silently.
2. The payoff moment is in-game (halftime/timeout), not just post-game — analysis views should answer "what's our weakness right now" fast, not just archive history.
3. All data is local and manually backed up — never design a flow that makes backup/restore harder to find or trust, and never assume server-side durability.
4. German product vocabulary (Kader, Spielplan, Wurfzonen, Torwand, Sicherung, etc.) is established identity — preserve it in refinement; only change it as a deliberate, confirmed decision.
5. Built for one real team (TSV Altenholz) today; keep team/season identity (name, season, league IDs) as configurable data, not hardcoded, since broader coach adoption is an explicit aspiration.

## Accessibility & Inclusion

No product-specific accessibility requirement was established beyond the confirmed operating context: used on a tablet (iPad), one-handed/quickly, courtside, likely in variable outdoor/gym lighting. Treat large touch targets and legible-at-a-glance contrast as informed by this real usage scene, not invented.
