# Machine drag swapping

Desktop players can drag an installed machine onto another installed machine to exchange their map positions. The source stays selected, the move saves immediately, and production order and connector endpoints remain unchanged. Existing engine relocation recalculates terrain and adjacency normally.

Native browser dragging highlights valid machines and the hovered destination. Empty ground/slots and cancellation do not move or save machines. Dragging is disabled during battle and explicit movement/connector selection. Touch and keyboard players retain the existing click/tap movement controls; native touch dragging is not claimed.

TDD: the three browser cases failed against the old map (positions unchanged, no target highlight, no draggable state), then passed after implementation. Final `npm run verify` passed syntax checks, all 89 unit tests and 30 Chromium browser cases. This includes bilingual full campaigns and the previous keyboard/map/layout/save regressions.

A fresh CLI browser at1280×720 independently dragged Miner onto Clone Vat, observed destination highlighting, released the mouse, and read swapped coordinates, selected source, valid saved state, and no document overflow. Review covered phase/mode gates, internal-only drag source, invalid targets, cleanup on render/dragend, and delegation to engine relocation. This was self-review, not independent review. No runtime dependencies or save-schema changes.
