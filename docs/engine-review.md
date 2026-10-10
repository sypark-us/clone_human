# Independent engine review

**No issues found in the reviewed engine.** This is a bounded independent review of `js/engine.js`, compared with `docs/product-plan.md` and `tests/engine.test.js`. The reviewer authored persistence, not this engine. No engine or test source was edited during review.

The three strongest attempts to falsify readiness were hostile serialized-state mutations, randomized legal runs checked after every action, and independently specified terrain boundaries combined with dense reaction chains. All completed without exposing a crash, invalid generated state, unbounded event chain, terrain discrepancy, or repeatable terminal reward.

## Evidence

All commands below ran in `/home/sypark/ch/clone_human` and exited 0.

Reviewed files identified by `sha256sum js/engine.js tests/engine.test.js`:

```text
e896f7a1c689522c8c8f62660dd29236c2de90c0aac5e2a3798d1157ab489801  js/engine.js
f8de95422154329432558cf401683099b7d163c16a9386f0ddfeb79065baaf29  tests/engine.test.js
```

`node --test tests/engine.test.js` returned:

```text
tests 33
suites 0
pass 33
fail 0
cancelled 0
skipped 0
todo 0
```

That suite includes early defense-objective success, rush loss at its limit, explicit eighth-wave victory, report immutability, exact event accounting, capped resources, all six starting builds, and real-engine persistence round trips. The last point supersedes the earlier integration limitation in `storage-evidence.md`.

### Attempt 1: accept a hostile save that crashes the next action

Every nested field of a real battle snapshot was independently replaced with 17 JSON-compatible hostile or boundary values. Accepted candidates were passed through preview, hints, and another tick; the resulting state had to validate again. Extra `__proto__`, `constructor`, and `prototype` keys were also injected at six structured boundaries.

Command:

```bash
node <<'NODE'
const E=require('./js/engine');
const assert=require('node:assert/strict');
const clone=x=>JSON.parse(JSON.stringify(x));
const base=E.createRun({seed:9});
E.chooseRoute(base,0); E.installModule(base,base.offers[0]);
E.startBattle(base); E.tick(base);
const values=[null,false,true,-1,0,1,12,120,9999,999999,1000000000,
  Number.MAX_SAFE_INTEGER,'constructor','__proto__',[],{}, {__proto__:null}];
const paths=[];
function pathsOf(value,path=[]){
  if(value&&typeof value==='object') for(const key of Object.keys(value)){
    const next=path.concat(key); paths.push(next); pathsOf(value[key],next);
  }
}
pathsOf(base);
let accepted=0,rejected=0,advanced=0;
for(const path of paths)for(const replacement of values){
  const candidate=clone(base); let owner=candidate;
  for(const key of path.slice(0,-1))owner=owner[key];
  owner[path.at(-1)]=clone(replacement);
  const serialized=clone(candidate);
  if(E.validateRun(serialized)){
    accepted++; E.getBattlePreview(serialized); E.getHints(serialized);
    E.tick(serialized);
    assert.ok(E.validateRun(serialized),path.join('.')+' = '+JSON.stringify(replacement));
    advanced++;
  }else rejected++;
}
for(const key of ['__proto__','constructor','prototype']) {
  for(const path of [[],['routes','0'],['upgrades'],['metrics'],
    ['metrics','mine'],['positions','0']]){
    const candidate=clone(base); let owner=candidate;
    for(const part of path) owner=owner[part];
    Object.defineProperty(owner,key,{enumerable:true,value:{polluted:true}});
    assert.equal(E.validateRun(clone(candidate)),false);
  }
}
console.log(JSON.stringify({mutations:accepted+rejected,accepted,rejected,advanced,
  hostileKeyRejections:18,pollution:{}.polluted===undefined?'none':'present'}));
NODE
```

Output:

```json
{"mutations":2924,"accepted":230,"rejected":2694,"advanced":230,"hostileKeyRejections":18,"pollution":"none"}
```

Why the attempt failed: strict keys, types, IDs, coordinate uniqueness, resource bounds, and result accounting rejected structurally unsafe candidates; accepted variants remained operational after a tick. This is robustness evidence, not proof that local saves cannot be edited to gain a gameplay advantage.

### Attempt 2: generate an invalid state through legal public actions

Three thousand deterministic games exercised all loadouts, routes, rerolls, replacement installs, ordering, relocation, purchases, battle previews, ticks, and wave transitions. Every action's JSON snapshot had to pass the validator; the preview had to agree with the actual battle start.

Command:

```bash
node <<'NODE'
const E = require('./js/engine');
const assert = require('node:assert/strict');
let actions = 0, ticks = 0, won = 0, lost = 0, maxWave = 0, maxEvents = 0;
let random = 72653;
const rng = n => {
  random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
  return random % n;
};
function checked(state, label) {
  actions++;
  assert.equal(E.validateRun(JSON.parse(JSON.stringify(state))), true, label);
}
for (let seed = 1; seed <= 3000; seed++) {
  const state = E.createRun({seed, loadout: E.LOADOUTS[seed % E.LOADOUTS.length].id});
  checked(state, 'create');
  while (state.phase === 'prepare') {
    E.chooseRoute(state, rng(2)); checked(state, 'route');
    if (state.energy >= 6 && rng(4) === 0) {
      E.reroll(state); checked(state, 'reroll');
    }
    E.selectSlot(state, rng(8)); checked(state, 'select');
    E.installModule(state, state.offers[rng(3)]); checked(state, 'install');
    for(let k=0;k<3;k++) {
      E.selectSlot(state, rng(8));
      E.moveSlot(state, rng(2) ? 1 : -1); checked(state, 'order');
      E.relocateSlot(state, rng(8), rng(12), rng(7)); checked(state, 'position');
      E.buyUpgrade(state, E.UPGRADES[rng(3)].id); checked(state, 'upgrade');
    }
    const preview = E.getBattlePreview(state);
    E.startBattle(state); checked(state, 'start');
    assert.equal(state.hp, preview.hp);
    assert.equal(state.shield, preview.shield);
    assert.equal(state.enemyAttack, preview.attack);
    while(state.phase === 'battle') {
      const prior = state.eventsTotal;
      E.tick(state); ticks++; checked(state, 'tick');
      assert.ok(state.eventsTotal - prior <= 120);
      maxEvents = Math.max(maxEvents, state.eventsTotal - prior);
    }
    maxWave=Math.max(maxWave,state.wave);
    if (state.phase === 'report') { E.nextWave(state); checked(state, 'next'); }
  }
  if (state.phase === 'won') won++;
  else if (state.phase === 'lost') lost++;
  else throw Error('unexpected phase');
}
console.log(JSON.stringify({games:3000,actions,ticks,won,lost,maxWave,maxEvents}));
NODE
```

Output:

```json
{"games":3000,"actions":386994,"ticks":71798,"won":2236,"lost":764,"maxWave":8,"maxEvents":19}
```

Why the attempt failed: all sampled public transitions preserved the validated schema, start previews agreed with combat, and all games reached an explicit terminal state. The sampled win rate is not a balance claim or representative user study.

### Attempt 3: move machines over a terrain boundary or amplify passive events

Expected values were specified independently as literals for each sector, tested at x=0,3,4,7,8,11. This probes both edges of every A/B/C zone for mining, cloning, mutation, and bombs.

Command:

```bash
node <<'NODE'
const E=require('./js/engine'); const assert=require('node:assert/strict');
const expected={
  factory:{mine:[6,4,4],clone:[2,3,2],mutation:[4,4,4],bomb:[28,28,36]},
  canyon:{mine:[7,4,4],clone:[2,2,2],mutation:[4,4,4],bomb:[28,28,45]},
  laboratory:{mine:[4,4,4],clone:[2,3,2],mutation:[6,4,4],bomb:[28,28,28]},
  wasteland:{mine:[4,6,4],clone:[2,2,2],mutation:[4,4,4],bomb:[42,28,42]},
  control:{mine:[4,4,8],clone:[3,2,2],mutation:[4,4,4],bomb:[28,45,28]}
};
let checks=0;
for(const [sector,modules] of Object.entries(expected))
for(const [module,want] of Object.entries(modules))
for(const x of [0,3,4,7,8,11]){
  const s=E.createRun({seed:4}); E.chooseRoute(s,0); E.installModule(s,s.offers[0]);
  s.wave=3; s.sectorId=sector; s.objectiveId='normal'; s.enemyId='standard';
  s.slots=[module,...Array(7).fill(null)]; s.positions[0]={x,y:0};
  s.energy=100; s.units=2; s.attack=2; E.startBattle(s); E.tick(s);
  const actual=module==='mine'?s.metrics.mine.energy:module==='clone'?
    s.metrics.clone.clones:module==='mutation'?s.attack:s.metrics.bomb.damage;
  assert.equal(actual,want[Math.floor(x/4)],`${sector}/${module}/x${x}`);
  assert.ok(E.validateRun(s)); checks++;
}
console.log(JSON.stringify({terrainBoundaryChecks:checks}));
NODE
```

Output:

```json
{"terrainBoundaryChecks":120}
```

The sustained-chain command below keeps initial damage low enough to exercise repeated production rather than instantly ending battles:

```bash
node <<'NODE'
const E=require('./js/engine'); const assert=require('node:assert/strict');
const chains=[
  ['clone','echo','onclone','onclone','recycle','recycle','recycle','recycle'],
  ['bomb','echo','revive','revive','revive','revive','recycle','recycle'],
  ['clone','clone','clone','clone','onclone','onclone','onclone','onclone'],
  ['bomb','onkill','onkill','autoclone','autoclone','onclone','onclone','recycle']
];
let battles=0,turns=0,maxEvents=0,maxLastTurn=0,wins=0;
for(const modules of chains)for(const sector of E.SECTORS)
for(const enemy of Object.keys(E.ENEMIES))for(const objective of Object.keys(E.OBJECTIVES)){
  const s=E.createRun({seed:4}); E.chooseRoute(s,0); E.installModule(s,s.offers[0]);
  s.wave=8; s.slots=modules.slice(); s.energy=999999; s.units=10; s.attack=1;
  s.enemyId=enemy; s.objectiveId=objective; s.sectorId=sector.id; E.startBattle(s);
  assert.ok(E.validateRun(s));
  while(s.phase==='battle'){
    const before=s.eventsTotal; E.tick(s); turns++; assert.ok(E.validateRun(s));
    assert.ok(s.eventsTotal-before<=120);
    maxEvents=Math.max(maxEvents,s.eventsTotal-before);
    maxLastTurn=Math.max(maxLastTurn,s.lastTurn.length);
  }
  const snapshot=JSON.stringify(s); E.tick(s); E.startBattle(s); E.reroll(s);
  assert.equal(JSON.stringify(s),snapshot); battles++; if(s.report.win)wins++;
}
console.log(JSON.stringify({battles,turns,maxEvents,maxLastTurn,wins,
  losses:battles-wins,terminalReplayMutations:0}));
NODE
```

Output:

```json
{"battles":360,"turns":3840,"maxEvents":21,"maxLastTurn":48,"wins":0,"losses":360,"terminalReplayMutations":0}
```

Why the attempt failed: zone calculations matched the specified values at both boundaries, and active echoes/passive reactions terminated while preserving event, log, and state constraints. No observed chain reached the event cap, so this is bounded-observation evidence, not a claim that the cap's exact drop behavior was dynamically exercised.

## Scope limits

- Actual map rendering, controller timers, restored-battle pause behavior, audio, and browser integration were outside this engine-only review and remain unverified here.
- The engine centralizes terrain definitions and effects. Actual map-label agreement remains a separate UI check; the terrain tests above verify engine semantics against literal expectations.
- Adversarial mutation coverage is finite. It does not prove exhaustive reachability validation or anti-cheat protection for editable local data.
