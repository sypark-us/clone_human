# Bilingual desktop dashboard

Canonical SDLC: build · peer-reviewed · task. Integration branch: `main`.

The user requested English and Korean and previously authorized automatic merging. Add an always-available, labeled header selector; keep Korean as the default. Persist the choice with existing settings, with no save-schema or gameplay change. Translate static text, accessible labels, dynamic game content, hints, existing battle logs, dialogs, and storage errors. Switching languages must preserve the selected starting design, run, pause state, and current screen.

Use a small local translation catalog with Korean source messages as keys, named placeholders for variable UI text, and explicit adapters for existing saved log templates. No network translation service or runtime dependencies. Existing arbitrary saved text remains literal text.

## Tasks

| Work | Owner | Evidence required |
| --- | --- | --- |
| Engine content and existing log translation catalog | engine | Catalog coverage, all message templates, unchanged unknown input |
| Language setting compatibility | persistence | Missing/invalid setting defaults, roundtrip, unchanged old run |
| UI selector, static and dynamic translation, mobile layout | primary | Browser tests fail before implementation, then pass in both languages |
| Review and shipping | primary + independent reviewer | Full verification, code review, deployed-file identity and browser smoke check |

## Acceptance and evidence

- English/Korean switching updates the welcome screen, game, help, codex, reports, accessible labels, page language and title.
- Reload restores the preference. Older saves still resume; switching does not reset or advance a paused run, reset a chosen loadout, or overwrite a corrupt save.
- English has no untranslated Korean in game content, including historic logs. Native language option names remain `한국어` and `English`.
- Both languages fit a phone without page-wide horizontal overflow, and all controls remain usable.
- Existing unit and browser checks pass; an English eight-wave campaign passes.

## Scope addition: desktop dashboard

The user also requested gameplay that fits one screen, suggested popups for secondary information, and confirmed desktop/laptop first. Keep resources, map, production order, battle status and command controls visible at 1366×768 and 1280×720. Use tabs for routes, construction, selected machine and upgrades; put detailed logs and reports in dialogs. Preserve the existing phone scrolling layout and restore it correctly when resizing. This addition is owned by the graphics contributor (layout.js, CSS, layout browser tests), with controller integration by the primary.

Additional acceptance: no desktop document scrolling during gameplay; map cells and main controls stay in the viewport; route/build/upgrade actions remain reachable; report continuation and log pause/close work; desktop/mobile resizing preserves nodes and game state. English text must fit these surfaces too.

Status: implementation and verification complete; ready to integrate. All acceptance checks pass at their stated scope. See [verification](language-verification.md) and [independent review](language-review.md). Imported hooks are not installed; verification was executed manually.
