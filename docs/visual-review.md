# Independent visual usability review

**Final disposition: SHIP for this bounded visual review.** Both original P2 findings below are resolved. The industrial-dusk direction is preserved; no rebranding or artwork replacement is needed.

## Scope and evidence

Reviewed on 2026-10-10 by the graphics contributor, who supplied the background and font but did not author the reviewed HTML, CSS, controller, or map renderer. This is an independent review of interface implementation, not an independent judgment of the supplied artwork.

- Read `docs/product-plan.md`, `index.html`, `styles.css`, `js/app.js`, and `js/map.js`.
- Visually inspected `/tmp/clone-welcome-desktop.png` (1440 × 1000), `/tmp/clone-game-desktop.png` (1440 × 1929), `/tmp/clone-welcome-mobile.png` (390 × 1043), and `/tmp/clone-game-mobile.png` (390 × 2545). Dimensions are image dimensions; full-page captures exceed the viewport height.
- Applied the relevant Impeccable craft-floor checks within this bounded review. The primary agent reported one detector warning for a health-bar width transition and an unavailable parser fallback. This reviewer did not rerun the detector or claim a complete automated audit.
- The mobile map intentionally scrolls internally to preserve tappable cells. Sticky command controls appear at their captured viewport position in full-page screenshots; their apparent mid-page placement is not a layout defect. The visible skip link in the mobile game capture is its keyboard-focus state.

## Material issues

### P2 — Hidden mobile map area lacks a navigation cue; reset label overpromises

At 390px, the map keeps a 570px minimum world width. This correctly preserves useful cell targets but hides the rightmost zone and machines until the player scrolls horizontally. The default capture provides no explicit swipe cue. The visible `전체 보기` control resets zoom to 1 and scrolling to the origin; it cannot fit the complete map at this width.

Evidence: `.map-world` in the mobile media rule; `FactoryMap.setZoom()` clamps to 1–1.8; the `zoom-reset` handler sets zoom 1 and scroll positions 0.

Minimal correction: label the reset action `기본 배율`, and show `좌우로 밀어 지도 탐색` at mobile widths when the map overflows. Keep the internal scrolling and tappable tiles. Confirm that horizontal scrolling reaches C, reset returns to the initial scale, and the caption describes the real action.

### P2 — Save failures disappear from the active mobile interface

At widths up to 850px, `.save-status` is hidden without an exception for `.error`. `save()` updates this hidden status and a note on the hidden welcome screen. A player in the mobile game therefore receives no visible warning if local saving fails, despite the welcome screen's autosave promise.

Minimal correction: show a concise persistent save-failure indicator at these widths, or show a toast on the first transition into failure and retain an accessible visible status until saving succeeds. Avoid repeating a toast every turn. Verify once with unavailable or quota-exhausted storage and once after a successful save.

## What already works

- The shared terrain, industrial machine drawings, restrained ore/green/rust palette, and gold action controls produce one coherent game world across welcome and gameplay.
- Machine numbers, selected-slot outlines, automatic belts, the production rack, resource counts, and the inspector make the factory state readable without placing fake UI in the image.
- Korean text renders cleanly in the provided captures. The main start control and three recommended starting builds have clear hierarchy. Help, audio controls, wave progress, and phase-specific command labels remain discoverable at both reviewed widths.
- Mobile layout stacks the operational panels and retains full-size map interactions. No page-level horizontal spill or broken title wrapping appears in the supplied screenshots.
- Executed token contrast calculations give 14.43:1 for body text/background, 7.07:1 for muted text/panel, 8.94:1 for primary-button text/gold, and 9.75:1 for welcome copy/background. These checks cover those fixed pairs, not every pixel over terrain or disabled state.

## Limits and handoff

This pass did not interact with the live browser, listen to music, review every battle/result/dialog state, or verify every contrast pair. Those belong to the primary agent's browser and behavioral evidence. The health-bar width animation is a narrow performance follow-up, not a material visual blocker in these captures; reduced-motion CSS is present.

Questions were skipped because the brief and committed visual direction already resolve the decisions needed for this bounded review.

## Resolution

Final recheck on 2026-10-10 covered the two findings only. Inspected `docs/screenshots/game-desktop.png`, `docs/screenshots/game-mobile.png`, and `docs/screenshots/save-error-mobile.png`, and read the changed labels, banner styles, and save handling.

| Finding | Status | Evidence |
| --- | --- | --- |
| Mobile map navigation/reset wording | **Resolved** | Both gameplay captures show `기본 배율`. The mobile capture adds `← 좌우로 밀어 지도 탐색 · + 버튼으로 확대 →` directly below the internally scrolling map. The cue describes the retained interaction and the reset label no longer promises a complete fit. |
| Hidden mobile save failure | **Resolved** | The 390px save-error capture shows a readable persistent warning at the viewport top, including recovery guidance and the consequence of closing the tab, plus a one-time failure toast. `#save-warning` lives outside both toggled screens, stays sticky, and is not hidden by the compact header's media rule. |

The implementation owner reports that the browser regression `save failure is visible during gameplay on a phone` failed before the fix and passed afterward; this reviewer read its assertions but did not rerun it. Source review confirms that successful saves hide the warning and the toast runs only when entering failure. No unresolved or partially resolved findings remain from this review. This verdict does not expand the original scope into a full functional, accessibility, or audio audit.
