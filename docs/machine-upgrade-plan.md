# Individual machine upgrades

Canonical SDLC: build · peer-reviewed · task. Current step: integrate and publish.
Approved direction: three levels, energy purchases between waves, a right-click preview beside each machine and an accessible panel action. Existing left-click, hover and drag controls remain usable.

## Design and acceptance

- All twelve machines begin at Lv.1; Lv.2 costs 12 E and Lv.3 costs 24 E. Levels improve the existing effect without adding ability branches. Numbers are an initial balance proposal, not proof of long-term difficulty.
- The engine owns level effects and purchase checks. No spending on empty machines, during battle, above Lv.3, or without enough energy. Mine energy 4/6/8; clone units 2/3/4; soldier units 1/2/3; mutation attack 2/3/4; bomb damage per unit 14/18/22; echo repeats 2/3/4; boost repeats 1/2/3; recycle energy 2/3/4; clone reaction damage multiplier 1/1.25/1.5; kill recovery energy 8/12/16; kill clones 2/3/4; revive units 1/2/3.
- Level travels with a machine through order changes and map swaps. Replacing a machine resets that machine to Lv.1; the install UI makes this clear before replacing an upgraded machine.
- Existing v1/v2 saves continue to run with original effects. First machine purchase adds a validated v3 level array without losing connectors. Invalid levels and excessive upgraded metrics remain rejected. Outer storage version stays unchanged.
- Right-click on map or production bar opens a small non-modal purchase preview, never an immediate purchase. The preview has a labelled close control, returns focus on Escape, closes on outside interaction, drag, scroll/resize and phase changes, and fits viewport edges. Empty ground retains the browser menu. Keyboard context-menu keys and the Machine panel button expose the same action.
- Icons have compact level badges. Tooltip, inspector and upgrade preview use the same current-level effect. English and Korean copy explain cost, maximum level, low energy, and battle restriction. Desktop gameplay remains within one screen.

## Tasks and evidence

| Task | Files | Acceptance evidence | Status |
| --- | --- | --- | --- |
| Engine and save contract | js/engine.js, tests/machine-upgrade.test.js | RED then GREEN: all machine effects, purchase boundaries, moves/replacement, legacy and v3 saves | Complete; auditor approved in machine-upgrade-review.md |
| Controls and presentation | js/app.js, js/map.js, js/i18n.js, js/i18n-content.js, index.html, styles.css, tests/browser/machine-upgrade.spec.js | RED then GREEN: right-click preview/purchase, panel/keyboard, dismissals, translations, save/resume, drag, layout/edges | Complete; auditor approved in machine-upgrade-review.md |
| Review and publish | README.md, docs/machine-upgrade-verification.md | Full local verification, real-browser visual inspection, independent evidence review, merge and live-site smoke checks | Review complete; publishing pending |

## Execution

1. Write unit tests for the documented engine APIs: getMachineLevel(state, slot), getModuleStats(id, level), getMachineUpgrade(state, slot), upgradeMachine(state, slot). Execute them before adding the APIs.
2. Add level definitions and guarded purchases; apply stats in active/reactive effects; preserve levels on ordering and reset on replacement; extend schema only for v3. Execute unit suite.
3. Write browser checks before adding the right-click preview and panel action. Share level summaries and purchase action, add bounded preview dismissal/focus behavior and translations, then execute browser suite.
4. Inspect real desktop and phone-size screens, execute npm run verify, perform quality self-review and independent evidence review. Document executed results and balance limitations.
5. Commit and push the feature, automatically merge using the reviewed head, verify Pages serves that merge and exercise purchases in a fresh production browser. No new dependencies or hosting changes.

Future stages and specialized upgrade trees are outside this change. Reverting the release preserves v3 saves as unsupported data instead of silently discarding purchased levels.
