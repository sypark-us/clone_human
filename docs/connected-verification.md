# Connected factory verification

`npm run verify` passed on 2026-10-10: all scripts syntax checked, 89 unit tests and 27 Chromium browser tests passed. The browser suite completes all eight waves in English and Korean, restores paused battles, checks optional rules before route choice, exercises adjacency and keyboard connectors, persists/removes links, limits links to two, locks construction during battle, and verifies the three-step first-play flow.

Desktop acceptance: no document scroll at 1280×720 or 1366×768, battle above management, core controls visible. A fresh local CLI session independently drove launch → route → machine, read the new command titles and saved state, and verified map/move/link/order controls fit. Its console reported zero errors or warnings. Automated browser runs check request failures and page errors. Reduced-motion tests confirm actual turn numbers without battle movement. Mobile-width regressions passed at 320px and 390px; physical touch devices and other browser engines were not exercised.

[First-play guide](screenshots/connected-intro-en.png) · [Laptop dashboard](screenshots/connected-dashboard-en.png)

Independent review by the persistence agent covered engine and UI changes it did not author. It reported no remaining P1/P2 issues after corrections: status now reads Battle paused, full route rules are optional but available before committing, and combat feedback explicitly reports retaliation losses rather than total clone consumption. Its executed checks passed 66 engine/rule/content tests, browser onboarding/combat checks, and 1,000 connected runs with validated actions and deterministic restored ticks. The engine and graphics authors also self-reviewed; those reviews are not independent.

Compatibility: legacy v1 games remain readable. Adjacency applies immediately to their layouts, so an older in-progress battle can have a different result after this update. The first successful manual link migrates the run to v2; the storage envelope remains v1. Bonuses attach to compatible module pairs and cap once per kind per target. Connections attach to slot numbers and are pruned when replacement or reordering makes them incompatible.

No active GitHub Actions workflow is configured; these are executed local checks, not remote CI. Existing main/root GitHub Pages hosting is unchanged.
