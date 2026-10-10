# Independent machine upgrade review

Verdict: approve the current individual-machine upgrade change. No blocking correctness, save compatibility, accessibility, security, or performance defect found. This review was performed by the separate `/root/upgrade_review` agent; it is independent of the implementation author's self-review.

## Scope and evidence

Reviewed `docs/machine-upgrade-plan.md`, the uncommitted engine, presentation, translation, and control changes, the new `js/machine-upgrades.js`, and both upgrade test files. Existing drag behavior remains a position swap; changing production order through drag is outside this review and awaits user clarification.

- Inspected `/tmp/ch-upgrade-engine-red.log`: all six initial engine tests failed before the new APIs existed. The subsequently added intermediate-stat test is not claimed to have been present in that RED run.
- Inspected `/tmp/ch-upgrade-browser-red.log`: four initial browser tests failed and one passed before the purchase controls existed. The initial dismissal test was a false positive because it did not first assert that the popup was visible; that test was subsequently strengthened. The subsequently added touch test is not claimed to have been present in that RED run.
- Independently executed `node --test tests/machine-upgrade.test.js`: seven tests passed, including all twelve machines' level-three combat effects, purchases and invalid actions, replacement/order/map movement, connectors, legacy migration, storage roundtrips, malformed levels, and upgraded campaign validation.
- Independently executed `npx playwright test tests/browser/machine-upgrade.spec.js --reporter=line`: six Chromium tests passed. Log: `/tmp/ch-upgrade-independent-browser.log`. Checks include preview before spending, real purchase and persistence, drag coexistence, keyboard context-menu access and Escape focus restoration, translation, viewport placement, dismissals, disabled reasons, and touch panel purchases.
- Independently probed v3 validation: a legal upgraded combat save was accepted; energy metrics above 16 per activation and clone metrics above six per activation were rejected.
- Inspected completed `/tmp/ch-upgrade-verify.log`: syntax checks, 96 unit tests, and 41 Chromium browser tests passed. This is local evidence, not remote CI evidence.

## Assessment

The engine owns both purchase guards and effects. Preview is read-only; purchase rechecks affordability and phase. Level data migrates only on successful purchase, follows slot ordering, stays attached during map movement, resets on replacement, and retains connectors. Save validation requires a dense eight-item level array with occupied/empty-slot constraints and preserves the legacy schema contract.

The non-modal preview uses a labelled dialog role, native buttons, translated close label, explicit current/next effects and disabled reasons, initial focus, and Escape return focus. Keyboard and touch alternatives exist. Dynamic content uses text nodes; no new dependency, network call, or growing per-frame handler is introduced. Shared stat-backed summaries keep inspector, tooltip, and preview consistent.

## Limits

Costs and strength have functional coverage, not evidence of long-term campaign balance. Browser evidence is Chromium only; actual screen-reader behavior and other browser engines were not independently tested. Visual screenshot inspection and cold production smoke tests belong to the implementation author's release verification and are not claimed as completed by this review. The new committed unit tests do not directly include the excessive-metric rejection probes; the independent probes above cover that acceptance requirement for this review.
