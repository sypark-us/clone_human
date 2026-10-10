# Combat engine evidence

Scope: `js/engine.js`, `tests/engine.test.js`, and this evidence artifact. No commit requested.

## Assumptions

- Active production executes from slot 1 to 8; reactions resolve after each active machine. Passive machines activate only when their event occurs.
- Mine, clone, mutation, bomb and recycle bonuses use the machine's grid column. Attack terrain multiplies damage from machines there and army basic damage when a clone/training machine is there; highest army multiplier wins. Defense terrain protects one unit per clone/training/revive machine stationed there.
- Defense objectives use the same kill rule as normal battles, with retaliation +1 and 12 turns. Killing early succeeds.
- Reports pause progression; rewards are awarded once at report creation, and nextWave grants reinforcements and opens new building choices.
- Resource and metric bounds are explicit so a restored run can never introduce unbounded computation or non-finite combat math.
- The enemy HP curve is 35, 90, 180, 330, 560, 900, 1400, 2150; swarm variants use 75%. Retaliation is `ceil(wave * 0.65)`, modified by enemy, objective, defenses and upgrades. Shield starts at `wave * 4` from wave 4 and regenerates `wave * 2` each third turn.
- A successful wave awards its objective reward plus `max(4, 12 - turns)` energy, capped by resource capacity; `report.reward` is the actual energy granted. Next-wave support adds 3 soldiers.
- Machine drafts always include one active production machine; each draft still has three distinct module IDs. Six explicit starting loadouts include the default balanced factory and five specialists.
- Production stops after a lethal hit, but the current reaction queue completes so bomb regeneration and kill rewards still resolve. Damage after death cannot trigger recycling or additional kills. Regeneration and upgrade reinforcements do not emit clone events; module descriptions disclose this.
- Passive machines count activations only when their trigger occurs. Shield hits count as recycling triggers, but damage metrics track actual core damage. Queue events (clone/damage/bomb/kill) count once; passive activations are reported separately.
- The save validator checks exact state/report/metric shapes, bounded integers, real IDs, dense arrays, unique positions/offers, phase consistency, health/damage accounting, and coherent metric/reward ranges. It is a corruption guard, not an anti-cheat system.

## Progress

- RED: `node --test tests/engine.test.js` → 23 tests, 0 pass, 23 fail. Every failure was the explicit assertion `engine.js must exist`; production implementation did not yet exist.
- GREEN: `node --test tests/engine.test.js` → 23 tests, 23 pass, 0 fail. Includes CommonJS/browser exports, seeded generation, all loadouts, setup gating, invalid actions, map relocation/order, battle build locks, +2 generator regression, upgrades, terrain ownership, reaction chains, event counting, no echo recursion, single kill rewards, early defense victory, rush defeat, eight-wave progression, restored simulation equivalence, bounded logs and malformed-state rejection.
- Full API implementation now available for interface integration. Additional enemy and persistence invariant checks are in progress; natural-loadout balance is not yet established by the fixture-based eight-wave test.
- Second RED: `node --test tests/engine.test.js` → 29 tests, 28 pass, 1 fail: array-valued sector IDs were coerced into valid keys. Added explicit ID type checks, dense array checks, health/damage invariants and reward bounds. GREEN: 29 pass, 0 fail.
- Balance RED: `node --test tests/engine.test.js` → 31 tests, 30 pass, 1 fail: the reference factory destroyed the final 600-HP core in one turn. Increased the later HP curve. GREEN: 31 pass, 0 fail; the seed-1 balanced reference factory now needs multiple turns for the final core.
- Third RED: `node --test tests/engine.test.js` → 33 tests, 32 pass, 1 fail: an impossible billion-activation battle metric was accepted. Added per-turn activation, per-activation output and dense event/log checks. GREEN: 33 pass, 0 fail.
- Real persistence integration is now exercised in the engine suite: prepare, battle, report, won and lost snapshots round-trip through `CloneHumanStorage.createStore(adapter, Engine.validateRun)`, and a restored battle takes the same next step as the original.

## Final verification

`node --test tests/engine.test.js`:

```text
tests 33
pass 33
fail 0
```

Every loadout completes eight waves at seed 7 using only the exported action API. The reference helper validates a JSON round-trip of every setup, battle turn and transition. An additional exploratory 300-run sample used that same helper at seeds 1–50 for every loadout:

```text
balanced: 50/50 wins; total turns 9–40; final turns 1–9
mining: 50/50 wins; total turns 9–36; final turns 1–8
cloning: 50/50 wins; total turns 9–35; final turns 1–9
explosive: 50/50 wins; total turns 8–34; final turns 1–10
mutation: 50/50 wins; total turns 8–16; final turns 1–3
recovery: 50/50 wins; total turns 9–36; final turns 1–7
```

Exact exploratory command:

```sh
node <<'NODE'
const E = require('./js/engine');
const source = require('node:fs').readFileSync('tests/engine.test.js', 'utf8');
const start = source.indexOf('function playReferenceStrategy');
const end = source.indexOf("test('reference starter strategy", start);
const run = new Function('engine', 'assert', 'copy', source.slice(start, end) + '; return playReferenceStrategy;')(() => E, require('node:assert/strict'), value => JSON.parse(JSON.stringify(value)));
for (const loadout of E.LOADOUTS) {
 const results = Array.from({ length: 50 }, (_, i) => run(i + 1, loadout.id));
 const wins = results.filter(result => result.state.phase === 'won');
 console.log(loadout.id + ': ' + wins.length + '/50 wins; total turns ' + Math.min(...results.map(r => r.turns)) + '–' + Math.max(...results.map(r => r.turns)) + '; final turns ' + Math.min(...wins.map(r => r.state.turn)) + '–' + Math.max(...wins.map(r => r.state.turn)));
}
NODE
```

This demonstrates a viable upgrade/draft strategy across sampled seeds, not subjective difficulty or fun. Browser gameplay remains **unverified by this slice**. Mutation builds are intentionally strong and finish faster in this sample.

`npm test` → **50 tests, 50 pass, 0 fail**, exit 0 (33 engine + 17 storage).

`node --check js/engine.js` → exit 0, no output.

`git diff --check` → exit 0, no output. These new files are untracked, so this is not a full whitespace check of their contents.

`git status --short -- js/engine.js tests/engine.test.js docs/engine-evidence.md`:

```text
?? docs/engine-evidence.md
?? js/engine.js
?? tests/engine.test.js
```

No commits or files outside the assigned engine scope were created by this agent.
