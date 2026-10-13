# Clone Human: factory map release

Request: extend the Korean prototype into a polished single-player browser game, hosted in the existing GitHub repository. Priorities: Factorio-inspired interactive map, graphics, music. User accepted building between waves and running production during combat.

## Scope and acceptance

1. Eight-wave complete run with selectable starting build; trustworthy objectives, rewards, terrain bonuses and results.
2. Interactive 12×7 factory grid: select, install and relocate eight machines; actual terrain bonuses depend on position. Conveyors connect in production order automatically. Build during preparation, observe during battle. Keyboard and touch alternatives to mouse input.
3. Distinct machine drawings, terrain, resource deposits, animated conveyors, clone/enemy combat graphics. Clear route choices between waves.
4. Pause/resume, single turn, adjustable speed, results, restart confirmation, module guide and first-play instructions.
5. Versioned validated local save, resume after refresh, recovery from corrupt/unavailable storage, saved preferences.
6. Original Web Audio ambient music and sound effects; opt-in playback after interaction, independent mute controls, automatic suspension while hidden.
7. Desktop/mobile checks, engine/storage regression tests, independent review. Static assets only; no backend, paid services or deployment configuration changes.

## Ownership and API

`js/engine.js` owns all rules and serializable run state. UMD/CommonJS export `CloneHumanEngine` in browsers. `js/storage.js` owns persistence. `js/audio.js` owns sound. `js/app.js` owns interaction, DOM and scheduling. `js/map.js` owns factory visualization. CSS/HTML own layout. Browser runtime has no dependency or build step.

Engine exports: `MODULES` object of `{id,name,description,kind}`, `LOADOUTS` array of `{id,name,description,slots,energy,units,attack}`, `SECTORS` array of `{id,name,description,lanes:[{name,kind,value}]}`, `OBJECTIVES` object of `{id,name,description,limit,reward,losses}`, `UPGRADES` array of `{id,name,description,baseCost,maxLevel}` (the next level's price comes only from `getUpgradeCost(state, id)`: 12, 18, 24 E; null at the cap), `ENEMIES` object of `{id,name,description}`. IDs retain original module IDs.

Methods mutate and return state (invalid actions safely no-op): `createRun({seed,loadout})`, `selectSlot(state,index)`, `installModule(state,id)`, `moveSlot(state,direction)` (swap order, positions stay with slots), `relocateSlot(state,index,x,y)`, `chooseRoute(state,index)`, `reroll(state)`, `buyUpgrade(state,id)`, `startBattle(state)`, `tick(state)`, `nextWave(state)`. Queries: `canStart(state)`, `getBattlePreview(state)` returns `{hp,maxHp,shield,attack,limit}`, `getHints(state)` array of strings, `validateRun(value)` boolean.

State fields: `version:1`, `seed`, `rngState`, `loadoutId`, `phase:'prepare'|'battle'|'report'|'won'|'lost'`, `wave` (1..8), `energy`, `units`, `attack`, `slots` (8 module IDs/null), `positions` (8 unique `{x,y}` in x=0..11 y=0..6), `selectedSlot`, `needsReward`, `offers` (3 IDs), `routes` (2 `{sectorId,objectiveId,enemyId}`), `routePending`, `sectorId`, `objectiveId`, `enemyId`, `upgrades:{power,training,fort}`, `turn`, `hp`, `maxHp`, `shield`, `enemyAttack`, `metrics` keyed by module/basic `{activations,damage,clones,energy}`, `totalDamage`, `eventsTotal`, `chainPeak`, `log` (bounded strings), `lastTurn` (bounded `{slot,kind,text}` events), `report` null or `{win,wave,turns,damage,events,peak,metrics,reason,reward}`. Terminal result is explicit, never derived only from HP. Report pauses before advancing.

Map zones derive from x: 0..3 A, 4..7 B, 8..11 C. Terrain multiplier/effect comes from chosen sector lanes. Production order is map reading order (y, then x): every relocation re-sorts the eight plots, so moving a machine renumbers them. Relocating onto another plot swaps positions first. Levels and connector endpoints follow their machines through renumbering. Moving production order swaps modules, not their positions. No buildings blocked by decorative terrain. Visual cables may cross; routing has no hidden cost.

Persistence exports `CloneHumanStorage`: `createStore(storage,validateRun)` with methods `load()` -> `{run,settings,error}`, `save(run,settings)` -> `{ok,error}`, `clearRun(settings)` -> `{ok,error}`. Settings `{music:false,sfx:true,speed:1,tutorialSeen:false}`. Errors are plain strings/null. Invalid records never crash the game. The controller explicitly pauses restored battles; saves occur after every committed action/turn, never mid-turn.

## Rules and numbers (balance pass, 2026-10-13)

All numbers live in `js/engine.js`; `tests/docs.test.js` checks the HP table and costs below against the engine.

- Enemy core HP by wave (`WAVE_HP`): 160 / 320 / 460 / 600 / 680 / 840 / 980 / 1080; swarm ×0.75. From wave 4 the core starts with `wave × 4` shield and regenerates `wave × 2` every third turn.
- Retaliation per turn: `ceil(wave × 0.5)` clones, plus 2 for the swarm core and for the defense objective, minus the fort upgrade and defense-lane bonus (`getBattlePreview`).
- Half carry-over between waves (`nextWave`): clones become `ceil(clones / 2) + 3`; attack becomes `base + floor(gain / 2)`, where `base` is the loadout's starting attack and `gain` is what mutation added above it (minimum 1). An early snowball cannot win every later wave alone.
- Kill triggers: Kill Salvager and Auto Cloner fire at the first crossing to half core HP and again on the kill, once each. The half-HP crossing is derived from the damage event, so no save field was added.
- Demolition Launcher consumes 1 clone and deals `18 + attack × 2` (Lv.1; 22 / 26 base at Lv.2 / 3), so it scales with army attack.
- Module numbers at Lv.1 / 2 / 3: miner energy 2 / 4 / 6; clone vat 4 E for 2 / 3 / 4 clones; training station 2 E for 2 / 3 / 4 clones; mutation lab 5 E for attack +1 / 2 / 3; time echo repeats 3 / 4 / 5; amplifier 1 / 2 / 3; recycler energy 2 / 3 / 4; clone reactor ×1 / 1.25 / 1.5; kill salvager energy 10 / 13 / 16; auto cloner clones 2 / 3 / 4; reviver clones 1 / 2 / 3.
- Costs: factory upgrades 12 / 18 / 24 E (`getUpgradeCost`); machine upgrades Lv.2 12 E, Lv.3 24 E.
- Route rewards: normal +6 E in 12 turns, rush +12 E in 8 turns, defense +12 E in 12 turns with +2 clone losses, each plus the speed bonus `max(4, 12 − turn)`.
- Feel: a turn lasts 1.8 s at 1x (`1800 / speed` in `js/app.js`). A battle's result is a banner on the map instead of a dialog (the report opens on request), the start button shows an exact forecast computed by the same engine tick on a copy (`getForecast`), and every machine's float shows the amount the engine applied that turn.

## Decisions

- Preserve Korean and all twelve module concepts. A balanced starter is default; specialists are selectable.
- Defense objective becomes "defeat within 12 turns" with stronger retaliation and higher reward; early kills never cause a loss. Keep rush 8 turns, normal 12. Rewards trade safety for pay: normal +6 E, rush +12 E, defense +12 E with clone losses +2 (plus the speed bonus max(4, 12 − turn)).
- Terrain effects are owned by engine position lookup; UI describes exactly those definitions.
- Original synthesized music avoids external streaming and licensing dependencies.
- Browser storage is local to the site/device. No account or cloud persistence.

## Work ledger

- Engine and rule tests: complete; see engine-evidence.md and engine-review.md.
- Save system and persistence tests: complete; see storage-evidence.md.
- Graphics assets: complete; see graphics-evidence.md.
- Interface, map, audio, integration: complete; see verification.md.
- complete; 53 unit and 6 browser tests pass. Independent engine review found no issues; interface and visual review findings resolved. See verification.md.

## Evidence

Baseline: clean main at 07aab85; prototype browser rendered on localhost:4187. Existing favicon returns 404; environment has no Korean system font. Generator grants +1 despite +2 description; survival objective penalizes early kills; event totals count cumulative queue processing repeatedly. These require explicit regression coverage.
