'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const enginePath = require('node:path').join(__dirname, '../js/engine.js');
const engine = () => { assert.ok(fs.existsSync(enginePath), 'engine.js must exist'); return require(enginePath); };
const copy = value => JSON.parse(JSON.stringify(value));

function ready(options = {}) {
  const E = engine();
  const s = E.createRun({ seed: 42, ...options });
  E.chooseRoute(s, 0);
  E.installModule(s, s.offers[0]);
  return s;
}
function battle(slots, changes = {}) {
  const E = engine();
  const s = ready();
  s.slots = [...slots, ...Array(8).fill(null)].slice(0, 8);
  s.sectorId = E.SECTORS[0].id;
  s.objectiveId = 'normal';
  s.enemyId = 'standard';
  s.positions = Array.from({ length: 8 }, (_, i) => ({ x: (i % 2) * 2, y: Math.floor(i / 2) * 2 }));
  Object.assign(s, changes);
  E.startBattle(s);
  return s;
}

test('exports the documented browser and CommonJS API with all twelve module concepts', () => {
  const E = engine();
  const context = {};
  vm.runInNewContext(fs.readFileSync(enginePath, 'utf8'), context);
  assert.equal(typeof context.CloneHumanEngine.createRun, 'function');
  assert.equal(Object.keys(E.MODULES).length, 12);
  for (const method of ['createRun', 'selectSlot', 'installModule', 'moveSlot', 'relocateSlot', 'chooseRoute', 'reroll', 'buyUpgrade', 'startBattle', 'tick', 'nextWave', 'canStart', 'getBattlePreview', 'getHints', 'validateRun']) assert.equal(typeof E[method], 'function', method);
  for (const module of Object.values(E.MODULES)) for (const key of ['id', 'name', 'description', 'kind']) assert.equal(typeof module[key], 'string');
  for (const loadout of E.LOADOUTS) for (const key of ['id', 'name', 'description', 'slots', 'energy', 'units', 'attack']) assert.ok(key in loadout);
});

test('seeded runs, rewards, routes and rerolls are deterministic and serializable', () => {
  const E = engine();
  const a = E.createRun({ seed: 'factory-42' });
  const b = E.createRun({ seed: 'factory-42' });
  assert.deepEqual(a, b);
  assert.equal(E.validateRun(a), true);
  assert.equal(E.validateRun(copy(a)), true);
  assert.notDeepEqual(a.offers.concat(a.routes), E.createRun({ seed: 'factory-43' }).offers.concat(E.createRun({ seed: 'factory-43' }).routes));
  E.reroll(a); E.reroll(b);
  assert.deepEqual(a, b);
});

test('every selectable loadout starts with valid definitions and state', () => {
  const E = engine();
  for (const loadout of E.LOADOUTS) {
    const s = E.createRun({ seed: 7, loadout: loadout.id });
    assert.equal(s.loadoutId, loadout.id);
    assert.deepEqual(s.slots.slice(0, loadout.slots.length), loadout.slots);
    assert.equal(E.validateRun(s), true, loadout.id);
  }
});

test('battle start waits for both route and offered module selection', () => {
  const E = engine(); const s = E.createRun({ seed: 5 });
  assert.equal(E.canStart(s), false);
  E.startBattle(s); assert.equal(s.phase, 'prepare');
  E.installModule(s, s.offers[0]); assert.equal(E.canStart(s), false);
  E.chooseRoute(s, 1); assert.equal(E.canStart(s), true);
  const preview = E.getBattlePreview(s);
  E.startBattle(s);
  assert.equal(s.phase, 'battle');
  assert.equal(s.hp, preview.hp); assert.equal(s.enemyAttack, preview.attack);
  assert.equal(E.validateRun(s), true);
});

test('invalid actions do not spend resources, consume rewards or corrupt slot state', () => {
  const E = engine(); const s = E.createRun({ seed: 2 }); const before = copy(s);
  E.selectSlot(s, -1); E.selectSlot(s, NaN); E.selectSlot(s, 2.5);
  E.installModule(s, 'constructor'); E.installModule(s, 'bad');
  E.chooseRoute(s, 2); E.chooseRoute(s, '0');
  E.moveSlot(s, 20); E.relocateSlot(s, 8, 0, 0); E.relocateSlot(s, 0, 12, 0); E.relocateSlot(s, 0, 1, -1);
  E.buyUpgrade(s, '__proto__'); E.tick(s); E.nextWave(s);
  assert.deepEqual(s, before);
});

test('relocation swaps occupied cells while production reorder keeps cell positions', () => {
  const E = engine(); const s = ready(); const positions = copy(s.positions); const modules = [...s.slots];
  E.relocateSlot(s, 0, positions[1].x, positions[1].y);
  assert.deepEqual(s.positions[0], positions[1]); assert.deepEqual(s.positions[1], positions[0]);
  assert.deepEqual(s.slots, modules);
  const relocated = copy(s.positions);
  E.selectSlot(s, 0); E.moveSlot(s, 1);
  assert.equal(s.slots[0], modules[1]); assert.equal(s.slots[1], modules[0]);
  assert.deepEqual(s.positions, relocated); assert.equal(s.selectedSlot, 1);
  assert.equal(E.validateRun(s), true);
});

test('building and shopping are locked throughout battle and report', () => {
  const E = engine(); const s = battle(['mine']); const before = copy(s);
  E.installModule(s, 'clone'); E.selectSlot(s, 5); E.moveSlot(s, 1);
  E.relocateSlot(s, 0, 10, 6); E.reroll(s); E.buyUpgrade(s, 'power'); E.chooseRoute(s, 1); E.startBattle(s);
  assert.deepEqual(s, before);
});

test('generator grants exactly +2 energy per upgrade level each turn', () => {
  const E = engine(); const s = battle([], { units: 0, energy: 10, upgrades: { power: 2, training: 0, fort: 0 } });
  E.tick(s); assert.equal(s.energy, 14);
});

test('upgrades pay once, stop at their cap and refuse unaffordable purchases', () => {
  const E = engine(); const s = ready(); s.energy = 100;
  const upgrade = E.UPGRADES.find(u => u.id === 'power');
  for (let i = 0; i < upgrade.maxLevel + 2; i++) E.buyUpgrade(s, 'power');
  assert.equal(s.upgrades.power, upgrade.maxLevel);
  assert.equal(s.energy, 100 - upgrade.cost * upgrade.maxLevel);
  s.energy = 0; E.buyUpgrade(s, 'training'); assert.equal(s.upgrades.training, 0);
});

test('mine and clone terrain bonuses follow the machine position', () => {
  const E = engine(); const a = battle(['mine', 'clone'], { energy: 10, units: 0 }); const b = copy(a);
  b.positions[0] = { x: 9, y: 0 }; b.positions[1] = { x: 5, y: 0 };
  E.tick(a); E.tick(b);
  assert.equal(a.metrics.mine.energy - b.metrics.mine.energy, 2);
  assert.equal(b.metrics.clone.clones - a.metrics.clone.clones, 1);
});

test('attack terrain boosts army damage only with a producing machine stationed there', () => {
  const E = engine(); const a = battle(['clone'], { energy: 0, units: 4 }); const b = copy(a);
  b.positions[0] = { x: 9, y: 0 };
  E.tick(a); E.tick(b);
  assert.equal(a.metrics.basic.damage, 8);
  assert.equal(b.metrics.basic.damage, Math.round(8 * E.SECTORS[0].lanes[2].value));
});

test('defense terrain requires clone, soldier or revive machines in its zone', () => {
  const E = engine(); const s = ready(); s.wave = 5; s.sectorId = E.SECTORS.find(v => v.lanes.some(l => l.kind === 'defense')).id;
  s.slots = ['clone', ...Array(7).fill(null)]; s.positions[0] = { x: 1, y: 6 };
  const outside = E.getBattlePreview(s).attack;
  s.positions[0] = { x: 5, y: 6 };
  assert.equal(E.getBattlePreview(s).attack, outside - 1);
  s.slots[0] = 'mine'; assert.equal(E.getBattlePreview(s).attack, outside);
});

test('recycling terrain applies only to the recycler at that position', () => {
  const E = engine(); const sector = E.SECTORS.find(v => v.lanes.some(l => l.kind === 'recycle'));
  const a = battle(['recycle'], { sectorId: sector.id, energy: 0, units: 1 }); const b = copy(a);
  b.positions[0] = { x: 9, y: 0 };
  E.tick(a); E.tick(b);
  assert.equal(a.metrics.recycle.energy, 2); assert.equal(b.metrics.recycle.energy, 3);
});

test('clone attacks, bomb resurrection and damage recycling resolve in production order', () => {
  const E = engine(); const s = battle(['clone', 'onclone', 'bomb', 'revive', 'recycle'], { energy: 10, units: 3, wave: 4 });
  E.tick(s);
  assert.equal(s.metrics.clone.clones, 2);
  assert.equal(s.metrics.revive.clones, 1);
  assert.equal(s.metrics.onclone.activations, 1);
  assert.equal(s.metrics.recycle.activations, 3);
  assert.ok(s.metrics.bomb.damage > 0);
  assert.equal(s.metrics.recycle.energy, 6);
});

test('event count counts each processed event once across multiple flushes', () => {
  const E = engine(); const s = battle(['clone', 'onclone', 'bomb', 'revive', 'recycle'], { energy: 10, units: 3, wave: 4 });
  E.tick(s);
  // clone, clone damage, bomb damage, bomb, basic damage; passive responses are not queue events.
  assert.equal(s.eventsTotal, 5);
  assert.equal(s.chainPeak, 5);
  E.tick(s); assert.equal(s.eventsTotal, 10); assert.equal(s.chainPeak, 5);
});

test('echo repeats the preceding active machine without recursively repeating echoes', () => {
  const E = engine(); const s = battle(['mine', 'echo', 'boost'], { units: 0, energy: 0 });
  E.tick(s);
  assert.equal(s.metrics.mine.activations, 3); assert.equal(s.energy, 18);
  assert.equal(s.metrics.echo.activations, 1); assert.equal(s.metrics.boost.activations, 1);
});

test('kill rewards trigger exactly once and do not farm energy from post-kill zero damage', () => {
  const E = engine(); const s = battle(['bomb', 'onkill', 'autoclone', 'onclone', 'recycle'], { energy: 0, units: 3 });
  s.hp = 1; E.tick(s);
  assert.equal(s.report.win, true);
  assert.equal(s.metrics.onkill.activations, 1); assert.equal(s.metrics.onkill.energy, 8);
  assert.equal(s.metrics.autoclone.clones, 2); assert.equal(s.metrics.onclone.activations, 1);
  assert.equal(s.metrics.recycle.activations, 1);
});

test('defense objective accepts an early kill and pays its described reward', () => {
  const E = engine(); const s = battle([], { objectiveId: 'survive', units: 100 }); const before = s.energy;
  E.tick(s);
  assert.equal(s.phase, 'report'); assert.equal(s.report.win, true); assert.equal(s.report.turns, 1);
  assert.ok(s.report.reward >= E.OBJECTIVES.survive.reward);
  assert.equal(s.energy - before, s.report.reward);
});

test('rush limit produces explicit loss with a matching serializable report', () => {
  const E = engine(); const s = battle([], { objectiveId: 'rush', units: 0 });
  for (let i = 0; i < 8; i++) E.tick(s);
  assert.equal(s.phase, 'lost'); assert.equal(s.report.win, false); assert.equal(s.turn, 8);
  assert.equal(E.validateRun(s), true);
  const before = copy(s); E.tick(s); E.nextWave(s); assert.deepEqual(s, before);
});

test('single run finishes all eight waves and stops at an explicit win', () => {
  const E = engine(); const s = ready(); s.units = 1000; s.attack = 20;
  for (let wave = 1; wave <= 8; wave++) {
    if (wave > 1) { E.nextWave(s); E.chooseRoute(s, 0); E.installModule(s, s.offers[0]); }
    assert.equal(s.wave, wave); E.startBattle(s);
    while (s.phase === 'battle') E.tick(s);
    assert.equal(s.report.win, true); assert.equal(E.validateRun(s), true, `wave ${wave}`);
    if (wave < 8) assert.equal(s.phase, 'report');
  }
  assert.equal(s.phase, 'won'); const before = copy(s); E.nextWave(s); E.tick(s); assert.deepEqual(s, before);
});

test('restored mid-battle state continues identically and bounded event logs survive dense chains', () => {
  const E = engine(); const s = battle(['clone', 'echo', 'onclone', 'onclone', 'onclone', 'recycle', 'recycle', 'revive'], { units: 0, wave: 8, energy: 300 });
  E.tick(s); const restored = copy(s); assert.equal(E.validateRun(restored), true);
  while (s.phase === 'battle') {
    const events = s.eventsTotal; E.tick(s); E.tick(restored);
    assert.deepEqual(s, restored);
    assert.ok(s.eventsTotal - events <= 120); assert.ok(s.lastTurn.length <= 160); assert.ok(s.log.length <= 40);
    assert.equal(E.validateRun(s), true);
  }
});

test('validator rejects malformed numeric fields, ids, arrays, positions and result contradictions', () => {
  const E = engine(); const valid = E.createRun({ seed: 1 });
  const mutations = [s => s.version = 3, s => s.energy = Infinity, s => s.units = -1, s => s.attack = 1.5,
    s => s.seed = 'x', s => s.rngState = 0, s => s.wave = 9, s => s.phase = 'done', s => s.loadoutId = 'bad',
    s => s.selectedSlot = 8, s => s.slots[0] = 'constructor', s => s.slots.pop(), s => s.positions[0].x = 12,
    s => s.positions[0] = s.positions[1], s => s.offers = ['mine', 'mine', 'mine'], s => s.routes[0].enemyId = 'bad',
    s => s.upgrades.power = 4, s => s.hp = s.maxHp + 1, s => s.metrics.basic.damage = NaN,
    s => s.metrics.mine.energy = -1, s => s.log = Array(41).fill('x'), s => s.log = ['x'.repeat(501)],
    s => s.lastTurn = [{ slot: 9, kind: 'damage', text: 'x' }], s => s.report = { win: true },
    s => s.phase = 'won', s => s.totalDamage = Number.MAX_SAFE_INTEGER, s => delete s.metrics.clone];
  for (const mutate of mutations) { const candidate = copy(valid); mutate(candidate); assert.equal(E.validateRun(candidate), false, mutate.toString()); }
  for (const value of [null, [], 1, 'x', {}, undefined]) assert.equal(E.validateRun(value), false);
});

test('preview and hints are read-only and consistently describe turn limits', () => {
  const E = engine(); const s = ready(); s.objectiveId = 'rush'; const before = copy(s);
  assert.equal(E.getBattlePreview(s).limit, 8); assert.ok(E.getHints(s).length > 0); assert.deepEqual(s, before);
});

test('validator rejects coerced ids and impossible battle damage and report accounting', () => {
  const E = engine();
  const mutations = [s => s.sectorId = [s.sectorId], s => s.objectiveId = [s.objectiveId], s => s.enemyId = [s.enemyId],
    s => s.routes[0].sectorId = [s.routes[0].sectorId], s => s.routes[0].enemyId = [s.routes[0].enemyId],
    s => s.maxHp += 100, s => s.metrics.basic.damage = 1, s => s.totalDamage = 1000000000,
    s => delete s.slots[0], s => delete s.positions[0], s => delete s.offers[0]];
  for (const mutate of mutations) { const s = E.createRun({ seed: 8 }); mutate(s); assert.equal(E.validateRun(s), false, mutate.toString()); }
  const s = battle([], { units: 100 }); E.tick(s); assert.equal(E.validateRun(s), true);
  s.report.reward = 23;
  assert.equal(E.validateRun(s), false, 'reward cannot exceed this objective and turn bonus');
});

test('jam, drain, armor and disrupt enemy traits each change their owned rule', () => {
  const E = engine();
  const jam = battle(['clone', 'soldier'], { enemyId: 'jam', energy: 10, units: 0, wave: 4 });
  E.tick(jam); assert.equal(jam.energy, 4); assert.equal(jam.metrics.clone.clones, 2); assert.equal(jam.metrics.soldier.clones, 0);
  const drain = battle([], { enemyId: 'drain', energy: 2, units: 0 });
  E.tick(drain); assert.equal(drain.energy, 0);
  const armor = battle(['bomb'], { enemyId: 'armor', units: 2 });
  E.tick(armor); assert.equal(armor.metrics.bomb.damage, 11);
  const disrupt = battle(['mine', 'echo'], { enemyId: 'disrupt', energy: 0, units: 0 });
  E.tick(disrupt); assert.equal(disrupt.metrics.mine.activations, 2);
});

test('mutation and bomb terrain bonuses apply only at the appropriate machines', () => {
  const E = engine();
  const mutation = battle(['mutation'], { sectorId: 'laboratory', energy: 5, units: 0 });
  E.tick(mutation); assert.equal(mutation.attack, 6);
  const bomb = battle(['bomb'], { sectorId: 'canyon', units: 2, wave: 3 });
  bomb.positions[0] = { x: 9, y: 0 }; E.tick(bomb); assert.equal(bomb.metrics.bomb.damage, 45);
});

test('no recycling energy is earned without a damaging hit', () => {
  const E = engine(); const s = battle(['recycle'], { energy: 0, units: 0 });
  E.tick(s); assert.equal(s.metrics.recycle.activations, 0); assert.equal(s.energy, 0); assert.equal(s.eventsTotal, 0);
});

test('reports stay immutable until nextWave and cannot pay rewards twice', () => {
  const E = engine(); const s = battle([], { units: 100 }); E.tick(s);
  const before = copy(s);
  E.startBattle(s); E.tick(s); E.buyUpgrade(s, 'power'); E.reroll(s); E.selectSlot(s, 2); E.chooseRoute(s, 1);
  assert.deepEqual(s, before);
  E.nextWave(s); const advanced = copy(s); E.nextWave(s); assert.deepEqual(s, advanced);
  assert.equal(s.energy, before.energy); assert.equal(s.units, before.units + 3); assert.equal(s.report, null);
});

test('resource production caps remain finite and valid at accepted save bounds', () => {
  const E = engine(); const s = battle(['mine', 'clone', 'mutation'], { energy: 999999, units: 9999, attack: 9999, wave: 8, upgrades: { power: 3, training: 3, fort: 3 } });
  assert.equal(E.validateRun(s), true); E.tick(s);
  assert.ok(s.energy <= 999999); assert.ok(s.units <= 9999); assert.ok(s.attack <= 9999); assert.equal(E.validateRun(s), true);
});

function playReferenceStrategy(seed, loadout) {
  const E = engine(); const s = E.createRun({ seed, loadout });
  const scores = { mine: 4, clone: 7, soldier: 2, mutation: 9, echo: 6, boost: 3, bomb: 1, recycle: 6, onclone: 5, onkill: 0, autoclone: 0, revive: 1 };
  let turns = 0;
  function valid() { assert.equal(E.validateRun(copy(s)), true, `${loadout}, seed ${seed}, wave ${s.wave}, phase ${s.phase}`); }
  while (s.phase === 'prepare') {
    const route = s.routes[0].enemyId === 'swarm' || s.routes[0].objectiveId === 'rush' ? 1 : 0;
    E.chooseRoute(s, route);
    const score = id => scores[id] - s.slots.filter(other => other === id).length * (id === 'mutation' ? 8 : id === 'clone' ? 4 : 5);
    const offer = [...s.offers].sort((a, b) => score(b) - score(a))[0];
    if (!s.slots.includes(null)) {
      const worst = s.slots.reduce((index, id, slot) => scores[id] < scores[s.slots[index]] ? slot : index, 0);
      E.selectSlot(s, worst);
    }
    E.installModule(s, offer);
    const desired = { power: 1, training: 2, fort: 3 };
    for (const id of ['fort', 'training', 'power']) while (s.energy >= 20 && s.upgrades[id] < desired[id]) E.buyUpgrade(s, id);
    valid(); E.startBattle(s); valid();
    while (s.phase === 'battle') { E.tick(s); turns++; valid(); }
    if (s.phase === 'report') { E.nextWave(s); valid(); }
  }
  return { state: s, turns };
}

test('reference starter strategy completes eight waves with a final core requiring multiple turns', () => {
  const result = playReferenceStrategy(1, 'balanced');
  assert.equal(result.state.phase, 'won');
  assert.ok(result.state.report.turns >= 2, 'final core should survive the first reference production cycle');
});

test('all six unmodified loadouts can complete eight waves using the public action API', () => {
  const E = engine();
  for (const loadout of E.LOADOUTS) {
    const result = playReferenceStrategy(7, loadout.id);
    assert.equal(result.state.phase, 'won', loadout.id);
    assert.ok(result.turns <= 96);
  }
});

test('validator rejects impossible reaction counters before another tick can overflow them', () => {
  const E = engine(); const s = battle(['mine'], { units: 0 });
  const impossible = [candidate => candidate.metrics.mine.activations = 1000000000,
    candidate => candidate.metrics.mine.energy = 10,
    candidate => candidate.metrics.clone.clones = 3,
    candidate => candidate.log = Array(1),
    candidate => candidate.lastTurn = Array(1)];
  for (const mutate of impossible) { const candidate = copy(s); mutate(candidate); assert.equal(E.validateRun(candidate), false, mutate.toString()); }
});

test('real storage restores prepare, battle, report and terminal runs without changing outcomes', () => {
  const E = engine(); const Storage = require('../js/storage');
  const data = new Map();
  const adapter = { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, value) };
  const store = Storage.createStore(adapter, E.validateRun);
  const snapshots = [E.createRun({ seed: 3 }), battle(['mine', 'clone'], { units: 4 })];
  const wonWave = battle([], { units: 100 }); E.tick(wonWave); snapshots.push(wonWave);
  const lost = battle([], { units: 0, objectiveId: 'rush' }); while (lost.phase === 'battle') E.tick(lost); snapshots.push(lost);
  snapshots.push(playReferenceStrategy(1, 'balanced').state);
  for (const snapshot of snapshots) {
    assert.equal(store.save(snapshot, { music: false, sfx: true, speed: 1, tutorialSeen: true }).ok, true);
    const loaded = store.load(); assert.equal(loaded.error, null); assert.deepEqual(loaded.run, snapshot);
    E.tick(snapshot); E.tick(loaded.run); assert.deepEqual(loaded.run, snapshot);
  }
});
