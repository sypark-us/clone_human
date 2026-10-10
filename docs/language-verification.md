# Bilingual desktop dashboard verification — 2026-10-10

`npm run verify` exited 0 after the final source changes: **65 unit tests passed, 19 browser tests passed**, and all eight production scripts passed syntax checks. `git diff --check` passed. Browser checks reject application exceptions and HTTP errors. The runner's `NO_COLOR`/`FORCE_COLOR` warnings came from the test environment.

## Behavior verified

- Korean remains the default. English/Korean changes update authored interface text, game catalogs, map labels, accessible names, hints, reports and existing saved battle logs.
- The selected language survives reload. Existing records without a language still load in Korean; invalid preferences fall back to Korean. Run snapshots and random state remain unchanged by translation.
- Welcome-screen language changes preserve the selected starting design. Switching a paused battle preserves its exact progress; switching an active battle does not interrupt its timer.
- Corrupt saved bytes remain intact when changing language. Starting a new game explicitly replaces them; translated storage warnings remain visible.
- Complete eight-wave campaigns succeed through real UI controls in both languages, including management tabs and popup report continuation.
- At 1366×768 and 1280×720, the document fits the viewport while the map, resources, production rack, battle panel and controls remain visible. Long management details can scroll inside their tab.
- Mobile/desktop transitions preserve run data and restore mobile controls. Empty report buttons stay hidden. Report dialogs reopen when returning to a saved result. Opening the battle log pauses production and closing it restores focus.
- The phone interface fits 320px width without document-wide horizontal overflow. It retains vertical scrolling.

## Review and browser evidence

[Independent review](language-review.md) caught three P2 defects: ambiguous English pause wording, an empty report control after resizing, and a report that did not reopen on resume. Their owners fixed them; four independently executed browser checks passed afterward. The reviewer excluded their own storage implementation; the primary reviewed that small settings change and its tests.

A fresh CLI browser session at 1280×720 started a real new game in English. Trusted map clicks moved slot 1 from zone A to zone B; the inspector readback changed accordingly. Reload restored both the English preference and slot position. English/Korean switching updated the same run. Document dimensions were exactly 1280×720. Console errors: 0. HTTP responses ≥400 during reload: 0.

- [English desktop](screenshots/dashboard-en.png)
- [Korean desktop](screenshots/dashboard-ko.png)

The translation catalog tests cover 96 unique engine catalog strings, all current hint paths, all storage error messages and legacy log templates. Numeric effects are preserved, unknown saved text remains literal, and translation does not mutate deterministic engine traces.

## Scope and rollback

These checks use Chromium and viewport emulation. Desktop gameplay receives the compact dashboard; welcome screens, small windows and phones retain scrolling. Detailed panels and dialogs may scroll internally. No exhaustive device, screen-reader or subjective audio claim is made.

The engine, save schema, hosting settings and runtime dependencies are unchanged. Reverting this feature restores the previous UI; older code ignores the additional language preference. Remote CI remains unavailable through the current workflow-restricted GitHub connection; these are executed local checks, not a claimed CI run.
