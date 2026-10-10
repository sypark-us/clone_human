# Persistence implementation evidence

Scope: `js/storage.js`, `tests/storage.test.js`, and this evidence document. No commits were created by the persistence implementor.

## Contract and decisions

- Exports only `createStore(storage, validateRun)` through CommonJS or `window.CloneHumanStorage`. Each store exposes `load`, `save`, and `clearRun` as specified in `product-plan.md`.
- One local-storage key, `clone-human:save`, holds `{version:1,run,settings}`. Envelope versioning is separate from engine state versioning; unsupported versions are rejected without implicit migration.
- `run:null` records preferences without a resumable game. `clearRun(settings)` writes such a record and reports quota/access failures; it does not remove preferences.
- Settings are copied individually: booleans only for `music`, `sfx`, and `tutorialSeen`; numeric `speed` only from `0.5`, `1`, `2`, or `3`. Unknown and inherited settings are ignored. Missing or invalid values use the documented defaults.
- A supported envelope with an invalid run can recover its sanitized preferences. An invalid envelope or unknown version returns defaults.
- The supplied engine validator must return exactly `true`; missing or throwing validators reject non-null runs. Saves validate both the supplied run and its serialized snapshot, preventing a `toJSON` transformation from bypassing validation.
- Records are limited to 262144 UTF-16 code units. Reads check this limit before parsing or engine validation; writes check it before storage mutation. Serialization failures, including cycles and BigInt, return failure results.
- `load()` never mutates storage. Corrupt and incompatible records remain available until an explicit successful `save` or `clearRun` replaces them. There is no automatic merging of untrusted data into a run or preference object.
- Errors are Korean plain strings or `null`; callers should display the error or a general recovery message rather than branch on exact wording.

## Executed checks

Working directory for every command: `/home/sypark/ch/clone_human`.

1. Initial RED: `node --test tests/storage.test.js` exited 1 because `../js/storage.js` did not yet exist (`MODULE_NOT_FOUND`; pass 0, fail 1).
2. Behavioral RED after adding an inert API scaffold: the same command exited 1 with `tests 17`, `pass 1`, `fail 16`. Failures included missing defaults, failed round-trip saves, missing corruption errors, and missing browser persistence behavior. The one passing test only checked rejecting unwritable data and preserving bytes, which the inert scaffold already did.
3. GREEN after implementation: `node --test tests/storage.test.js` exited 0 with:

   ```text
   tests 17
   suites 0
   pass 17
   fail 0
   cancelled 0
   skipped 0
   todo 0
   ```

4. Syntax: `node --check js/storage.js` exited 0 with no output.

The 17 tests cover default settings isolation, snapshot persistence, all supported speeds, preference sanitization, corrupt JSON, incompatible/malformed envelopes, validator rejection and exceptions, preserving prior saves, clearing runs, explicit recovery, storage denial, quota failures, size limits, serialization failures, serialized-snapshot validation, and browser-global UMD use.

## Integration requirements and verification limits

- Acquire `window.localStorage` inside the controller's own `try/catch`, since the browser property access itself may throw before `createStore` is called. Pass `null` if unavailable.
- Pass `CloneHumanEngine.validateRun`; the unit suite uses an intentionally narrow validator fixture to isolate storage behavior. A round trip with the completed engine is not yet verified by this slice.
- Pause restored battles in the controller and save only after committed actions/turns. Storage preserves the supplied phase and does not manage scheduling.
- After a load error, avoid automatically overwriting the preserved bytes with a fallback run before the player chooses a new run or another explicit committed action.
- Browser local-storage availability and controller recovery UI require the primary agent's browser checks. The UMD test executes the browser export in Node's VM; it is not browser evidence.

## Assumptions

- A single versioned envelope is sufficient for the current single-run game; no older released schema was identified in the supplied contract.
- A 256 Ki-code-unit limit is ample for the bounded game logs while making the parse/write limit explicit.
- Recovering supported preferences from an invalid run is useful and safe because all preference fields are independently sanitized.
- The validator is a pure engine query; storage does not attempt to prevent callback side effects.
