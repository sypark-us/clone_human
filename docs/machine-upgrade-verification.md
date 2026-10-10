# Machine upgrade release evidence

## Executed verification

- Initial engine RED run: six failing tests because individual upgrade APIs were absent. The later intermediate-stat check adds coverage; it was not part of that RED run.
- Initial browser RED run: four failing checks because the preview and panel action were absent. The initial dismissal check passed without proving popup existence; it was strengthened to require a visible popup before dismissal. A later test exercises real Chromium touch events.
- Targeted browser checks found a queued scroll-into-view event closing a newly opened phone preview and an overlapping preview blocking drag initiation. Scroll dismissal now checks whether its source moved; previews appear below/above the source. All six final upgrade browser scenarios pass.
- Final local `npm run verify`: syntax checks, **96 unit tests**, and **41 Chromium browser tests** passed, zero skips or failures. Tests cover all twelve machine effects, purchase restrictions, ordering/movement/replacement, v1/v2/v3 storage, connections/terrain/enemy interactions, translations, preview dismissal, native drag, keyboard access, touch, save/resume, and screen bounds.
- Fresh local browser inspected at 1280 × 720 in English and 390 × 844 in Korean. Preview text matches current/next effects and cost; the desktop fits one screen and the phone has no horizontal page overflow.
- Independent reviewer reran seven upgrade unit tests and six browser tests, checked v3 metric bounds, and approved. See [independent review](machine-upgrade-review.md).
- Self-review: correctness, readability, module boundaries, untrusted save validation, bounded work/performance, and interaction/accessibility checks passed. Static preview markup uses text-only dynamic content; purchase guards live in the engine; level descriptions share engine stats. `git diff --check` passed.

## Practical limits

Level costs and strength are initial tuning, not a claim of long-term campaign balance. Automated checks use Chromium; physical devices, other browser engines, and real screen-reader use were not tested. No hosted test workflow was added or claimed; the tests ran locally. Existing Pages deployment serves the merged main branch.

## Save contract

New unupgraded runs keep v2. Legacy v1/v2 games retain original effects until a successful individual-machine purchase creates v3 `machineLevels` (eight entries: 1–3 on installed machines, 0 on empty slots) and retains connectors. Ordering swaps levels with machines; map movement preserves their slot association; replacement sets Lv.1. Unsupported or malformed saves remain protected by existing storage handling. Reverting to the earlier game makes v3 unsupported rather than discarding purchased levels.
