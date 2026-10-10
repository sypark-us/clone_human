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

Engine exports: `MODULES` object of `{id,name,description,kind}`, `LOADOUTS` array of `{id,name,description,slots,energy,units,attack}`, `SECTORS` array of `{id,name,description,lanes:[{name,kind,value}]}`, `OBJECTIVES` object of `{id,name,description,limit,reward}`, `UPGRADES` array of `{id,name,description,cost,maxLevel}`, `ENEMIES` object of `{id,name,description}`. IDs retain original module IDs.

Methods mutate and return state (invalid actions safely no-op): `createRun({seed,loadout})`, `selectSlot(state,index)`, `installModule(state,id)`, `moveSlot(state,direction)` (swap order, positions stay with slots), `relocateSlot(state,index,x,y)`, `chooseRoute(state,index)`, `reroll(state)`, `buyUpgrade(state,id)`, `startBattle(state)`, `tick(state)`, `nextWave(state)`. Queries: `canStart(state)`, `getBattlePreview(state)` returns `{hp,maxHp,shield,attack,limit}`, `getHints(state)` array of strings, `validateRun(value)` boolean.

State fields: `version:1`, `seed`, `rngState`, `loadoutId`, `phase:'prepare'|'battle'|'report'|'won'|'lost'`, `wave` (1..8), `energy`, `units`, `attack`, `slots` (8 module IDs/null), `positions` (8 unique `{x,y}` in x=0..11 y=0..6), `selectedSlot`, `needsReward`, `offers` (3 IDs), `routes` (2 `{sectorId,objectiveId,enemyId}`), `routePending`, `sectorId`, `objectiveId`, `enemyId`, `upgrades:{power,training,fort}`, `turn`, `hp`, `maxHp`, `shield`, `enemyAttack`, `metrics` keyed by module/basic `{activations,damage,clones,energy}`, `totalDamage`, `eventsTotal`, `chainPeak`, `log` (bounded strings), `lastTurn` (bounded `{slot,kind,text}` events), `report` null or `{win,wave,turns,damage,events,peak,metrics,reason,reward}`. Terminal result is explicit, never derived only from HP. Report pauses before advancing.

Map zones derive from x: 0..3 A, 4..7 B, 8..11 C. Terrain multiplier/effect comes from chosen sector lanes. Occupied relocation swaps positions. Moving production order swaps modules, not their positions. No buildings blocked by decorative terrain. Visual cables may cross; routing has no hidden cost.

Persistence exports `CloneHumanStorage`: `createStore(storage,validateRun)` with methods `load()` -> `{run,settings,error}`, `save(run,settings)` -> `{ok,error}`, `clearRun(settings)` -> `{ok,error}`. Settings `{music:false,sfx:true,speed:1,tutorialSeen:false}`. Errors are plain strings/null. Invalid records never crash the game. The controller explicitly pauses restored battles; saves occur after every committed action/turn, never mid-turn.

## Decisions

- Preserve Korean and all twelve module concepts. A balanced starter is default; specialists are selectable.
- Defense objective becomes "defeat within 12 turns" with stronger retaliation and higher reward; early kills never cause a loss. Keep rush 8 turns, normal 12.
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
