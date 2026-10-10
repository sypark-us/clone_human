'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine');
const Storage = require('../js/storage');
const copy = value => JSON.parse(JSON.stringify(value));
function ready(slots = ['mine', 'clone', 'soldier']) {
  const s = E.createRun({ seed: 1 }); E.chooseRoute(s, 0); E.installModule(s, s.offers[0]);
  s.slots = [...slots, ...Array(8).fill(null)].slice(0, 8); s.energy = 100;
  s.sectorId = 'laboratory'; s.enemyId = 'standard'; s.objectiveId = 'normal';
  s.positions = Array.from({ length: 8 }, (_, i) => ({ x: (i % 4) * 3, y: Math.floor(i / 4) * 3 }));
  return s;
}
function upgraded(slots, level) {
  const s = ready(slots);
  for (let slot = 0; slot < slots.length; slot++) for (let l = 1; l < level; l++) { s.energy = 100; E.upgradeMachine(s, slot); }
  s.energy = 100; return s;
}

test('purchase previews are read-only and upgrades charge once with strict preparation guards', () => {
  const s = ready(), before = copy(s);
  assert.deepEqual(E.getMachineUpgrade(s, 0), { level: 1, nextLevel: 2, cost: 12, canUpgrade: true });
  assert.deepEqual(s, before); E.upgradeMachine(s, 0);
  assert.equal(s.energy, 88); assert.equal(E.getMachineLevel(s, 0), 2); assert.equal(s.version, 3);
  E.upgradeMachine(s, 0); assert.equal(s.energy, 64); assert.equal(E.getMachineLevel(s, 0), 3);
  assert.deepEqual(E.getMachineUpgrade(s, 0), { level: 3, nextLevel: null, cost: 0, canUpgrade: false });
  const capped = copy(s); E.upgradeMachine(s, 0); assert.deepEqual(s, capped);
  for (const slot of [-1, 8, 0.5, '0', NaN, 4]) { const c = copy(s); E.upgradeMachine(s, slot); assert.deepEqual(s, c); }
  for (const phase of ['battle', 'report', 'won', 'lost']) { const c = ready(); c.phase = phase; const before = copy(c); E.upgradeMachine(c, 1); assert.deepEqual(c, before); }
  const poor = ready(); poor.energy = 11; const unchanged = copy(poor); E.upgradeMachine(poor, 0); assert.deepEqual(poor, unchanged);
});

test('stat queries expose intermediate levels without sharing mutable definitions', () => {
  const mine = E.getModuleStats('mine', 2); assert.deepEqual(mine, { energy: 6 }); mine.energy = 999;
  assert.deepEqual(E.getModuleStats('mine', 2), { energy: 6 });
  for (const level of [0, 4, 1.5, '2']) assert.equal(E.getModuleStats('mine', level), null);
  assert.equal(E.getModuleStats('unknown', 1), null);
  const s = upgraded(['mine'], 2); E.startBattle(s); E.tick(s); assert.equal(s.metrics.mine.energy, 6);
});

test('levels follow machines through ordering and map swaps, but replacements start at level one', () => {
  const s = upgraded(['mine', 'clone'], 2); s.energy = 100; E.upgradeMachine(s, 0);
  E.selectSlot(s, 0); E.moveSlot(s, 1); assert.deepEqual(s.machineLevels.slice(0, 2), [2, 3]); assert.equal(s.slots[1], 'mine');
  const levels = [...s.machineLevels]; E.relocateSlot(s, 1, s.positions[0].x, s.positions[0].y); assert.deepEqual(s.machineLevels, levels);
  s.needsReward = true; E.installModule(s, s.offers[0]); assert.equal(E.getMachineLevel(s, 1), 1);
  E.selectSlot(s, 7); s.needsReward = true; E.installModule(s, s.offers[0]); assert.equal(E.getMachineLevel(s, 7), 1);
});

test('each active and reactive machine applies its level-three effect to real combat', () => {
  const cases = [
    ['mine', ['mine'], s => assert.equal(s.metrics.mine.energy, 8)],
    ['clone', ['clone'], s => assert.equal(s.metrics.clone.clones, 4)],
    ['soldier', ['soldier'], s => assert.equal(s.metrics.soldier.clones, 3)],
    ['mutation', ['mutation'], s => assert.equal(s.attack, 8)],
    ['bomb', ['bomb'], s => assert.equal(s.metrics.bomb.damage, 44)],
    ['echo', ['mine', 'echo'], s => assert.equal(s.metrics.mine.activations, 5)],
    ['boost', ['mine', 'boost'], s => assert.equal(s.metrics.mine.activations, 4)],
    ['recycle', ['soldier', 'recycle'], s => assert.equal(s.metrics.recycle.energy, 4)],
    ['onclone', ['clone', 'onclone'], s => assert.equal(s.metrics.onclone.damage, 12)],
    ['revive', ['bomb', 'revive'], s => assert.equal(s.metrics.revive.clones, 3)]
  ];
  for (const [id, slots, check] of cases) {
    const s = upgraded(slots, 3); s.wave = 8; s.units = 4; E.startBattle(s); s.shield = 0; E.tick(s); check(s);
    assert.equal(E.validateRun(s), true, id + ' upgraded combat must save');
  }
  for (const id of ['onkill', 'autoclone']) {
    const s = upgraded([id], 3); s.units = 30; E.startBattle(s); E.tick(s);
    assert.equal(s.phase, 'report'); assert.equal(s.metrics[id][id === 'onkill' ? 'energy' : 'clones'], id === 'onkill' ? 16 : 4);
    assert.equal(E.validateRun(s), true, id);
  }
});

test('upgrades stack with terrain, connectors and enemy rules without losing links on migration', () => {
  const s = ready(['mine', 'clone', 'mutation']); E.connectSlots(s, 0, 1); E.connectSlots(s, 2, 1);
  for (const slot of [0, 1, 2]) { s.energy = 100; E.upgradeMachine(s, slot); E.upgradeMachine(s, slot); }
  assert.equal(E.getSynergyBonus(s, 1).costReduction, 1); assert.equal(E.getSynergyBonus(s, 1).clones, 1);
  E.disconnectSlots(s, 0, 1); assert.equal(s.connectors.length, 1); assert.equal(s.version, 3); E.connectSlots(s, 0, 1);
  assert.equal(s.connectors.length, 2);
  s.positions[1] = { x: 5, y: 2 }; s.energy = 100; s.wave = 8; s.enemyId = 'jam'; E.startBattle(s); E.tick(s);
  assert.equal(s.metrics.clone.clones, 6); assert.equal(s.energy, 98); assert.equal(E.validateRun(s), true);
  const disrupted = upgraded(['mine', 'echo'], 3); disrupted.enemyId = 'disrupt'; E.startBattle(disrupted); E.tick(disrupted);
  assert.equal(disrupted.metrics.mine.activations, 4);
});

test('v1/v2 saves keep original effects, migrate on purchase, and v3 roundtrips reject malformed levels', () => {
  for (const version of [1, 2]) {
    const s = ready(); s.version = version; if (version === 1) delete s.connectors;
    assert.equal(E.validateRun(s), true); assert.equal(E.getMachineLevel(s, 0), 1);
    E.upgradeMachine(s, 0); assert.equal(E.validateRun(s), true); assert.deepEqual(s.connectors, []);
    let raw; const store = Storage.createStore({ setItem: (_, v) => raw = v, getItem: () => raw }, E.validateRun);
    assert.equal(store.save(s, {}).ok, true); assert.deepEqual(store.load().run, s);
    for (const mutate of [c => delete c.machineLevels, c => c.machineLevels.pop(), c => c.machineLevels[0] = 0,
      c => c.machineLevels[0] = 4, c => c.machineLevels[0] = '2', c => c.machineLevels[7] = 1,
      c => delete c.machineLevels[0], c => c.machineLevels[0] = 1.5, c => c.version = 2]) {
      const invalid = copy(s); mutate(invalid); assert.equal(E.validateRun(invalid), false, mutate.toString());
    }
  }
});

test('upgraded eight-wave runs remain valid after each turn and serialize through a final report', () => {
  const s = E.createRun({ seed: 42 });
  while (s.phase !== 'won' && s.phase !== 'lost') {
    if (s.phase === 'prepare') {
      E.chooseRoute(s, 0); E.installModule(s, s.offers[0]);
      const slot = s.slots.indexOf('mine'); if (slot >= 0) E.upgradeMachine(s, slot); E.startBattle(s);
    } else if (s.phase === 'battle') E.tick(s); else E.nextWave(s);
    assert.equal(E.validateRun(copy(s)), true, s.phase + ' wave ' + s.wave);
  }
  assert.ok(s.turn > 0);
});
