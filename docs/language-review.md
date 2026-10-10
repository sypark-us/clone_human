# Independent language and layout review

**Verdict: no remaining P1/P2 findings in the reviewed scope.** Three P2 findings were reported to their owners, corrected, and independently rechecked. No production files were changed by this reviewer.

## Scope

Reviewed `js/i18n.js`, `js/i18n-content.js`, `js/app.js`, `js/map.js`, `index.html`, and the subsequently integrated `js/layout.js` and desktop CSS against `docs/language-plan.md`. Focus: translation meaning, source bindings, language switching during a run, literal rendering of saved text, corrupt-save preservation paths, report lifecycle, resizing, and access to controls.

The reviewer's own storage implementation was excluded from independent review. Browser geometry and the complete campaign remain covered by the primary agent's broader verification, not by this bounded verdict.

## Findings and resolution

| Severity | Finding | Resolution and independent evidence |
| --- | --- | --- |
| P2 | A running English battle labeled its pause action “Paused”, sharing the status translation. | Action and status now use separate source keys. The targeted browser test verifies “Pause battle” and continued combat across a language switch. |
| P2 | Entering desktop layout from mobile preparation exposed a report button with no report, opening an empty dialog. | Report-button visibility now follows current phase in `syncMode()`. The resize browser test verifies the button stays hidden, run data remains identical, and route/build/movement controls return on mobile. |
| P2 | Returning home and choosing the last result did not reopen an already viewed report because the previous phase was retained. | Report presentation now has its own visibility lifecycle and resets on returning home. The report browser test covers switching language on the welcome screen, dismissal, resizing, and returning home/resuming the same report. |

Before correction, `node /tmp/clonehuman-review-layout.cjs` exited 0 and reproduced `reportButtonVisible:true` with `reportContentHidden:true`, an open empty report dialog, and `reportDialogOpen:false` after returning home/resuming. That temporary DOM adapter was diagnostic evidence; the final resolution evidence below uses real browsers.

## Executed evidence

Working directory: `/home/sypark/ch/clone_human`.

```bash
npm run test:browser -- tests/browser/layout.spec.js tests/browser/language.spec.js --grep 'resiz|report|English battle action' --output=/tmp/clone-independent-review
```

Exit 0; **4 passed (2.0s)**:

- English battle action describes pausing and switching language keeps the battle running.
- Desktop report popup continues to the next wave through its real action.
- Resizing preserves gameplay and never offers an empty battle report.
- A report still opens after changing language on the welcome screen.

Earlier supporting command `node --test tests/i18n-content.test.js` exited 0 with **9 passed, 0 failed**. It covers catalog effects, hints, storage error copy, saved log templates, unchanged unknown text, and deterministic translated combat traces.

## Limits

- No exhaustive browser/device or screen-reader claim; targeted checks use the project's configured browser runner.
- Full-suite results and release/deployment identity belong to the primary verification record.
- Source inspection found no additional actionable translation or saved-text injection defect. Editable local data is not an anti-cheat boundary.
