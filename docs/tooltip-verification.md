# Machine tooltip verification

The requested hover explanation was previously absent. Map tiles and production rack buttons now share a compact tooltip with the machine name, translated base effect, and applicable terrain and incoming connection bonuses. It appears below the icon where space permits and stays inside the viewport. Keyboard focus and touch expose the same information; Escape, outside interaction, dragging, and scrolling the anchor offscreen dismiss it.

## Executed evidence

- Test-first browser checks failed before implementation because no tooltip existed.
- A separate phone scroll regression failed before fixing anchor visibility in the map renderer.
- Final `npm run verify`: 89 unit tests and 35 Chromium browser tests passed, including five tooltip cases covering hover, keyboard, translation, touch, drag swaps, viewport edges, real connection bonuses, and dialogs.
- Fresh local browser screenshots inspected at 1280 × 720 and 390 × 844 in English and Korean.
- `git diff --check` passed. Self-review checked shared descriptions, text-only tooltip content, scoped terrain effects, timer cleanup, and coexistence with native drag behavior.

These checks ran locally. Physical-device touch behavior and browsers other than Chromium were not tested.
