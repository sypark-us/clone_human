'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');

// The machines each module needs in front of it for its terrain effect to
// show: reactions need something to react to, echoes something to repeat.
const SETUP = { clone: ['mine'], soldier: ['mine'], echo: ['clone'], boost: ['clone'], onclone: ['clone'], revive: ['bomb'] };
const KINDS = [...new Set(E.SECTORS.flatMap(sector => sector.lanes.map(lane => lane.kind)))];

// Fixed helpers sit in the top-left plot row; the machine under test is the
// last in map reading order and only its column changes between runs.
function outcome(id, sector, lane) {
  const slots = [...(SETUP[id] || []), id];
  const state = E.createRun({ seed: 7 });
  E.chooseRoute(state, 0); E.installModule(state, state.offers[0]);
  state.sectorId = sector.id; state.objectiveId = 'normal'; state.enemyId = 'standard';
  state.wave = 3; state.energy = 60; state.units = 12;
  state.slots = [...slots, ...Array(8 - slots.length).fill(null)];
  if (state.version === 3) state.machineLevels = state.slots.map(slot => slot ? 1 : 0);
  state.connectors = [];
  state.positions = state.slots.map((_, slot) => slot < slots.length - 1 ? { x: slot * 2, y: 0 } : slot === slots.length - 1 ? { x: lane * 4 + 1, y: 5 } : { x: slot + 3, y: 6 });
  const preview = E.getBattlePreview(state);
  Object.assign(state, { hp: preview.hp, maxHp: preview.maxHp, shield: preview.shield, enemyAttack: preview.attack });
  assert.equal(E.validateRun(state), true, 'fixture must be a legal save');
  E.startBattle(state);
  for (let turn = 0; turn < 3; turn++) E.tick(state);
  // Where the machine stands is the one input that must not count as output.
  return JSON.stringify({ ...state, positions: null });
}

test('terrainKinds returns lane kinds the sectors actually offer', () => {
  for (const id of Object.keys(E.MODULES)) {
    const kinds = E.terrainKinds(id);
    assert.ok(Array.isArray(kinds), id);
    for (const kind of kinds) assert.ok(KINDS.includes(kind), id + ' lists unknown kind ' + kind);
  }
  assert.deepEqual(E.terrainKinds('nothing'), []);
  assert.deepEqual(E.terrainKinds(null), []);
});

test('a lane changes a machine\'s battle exactly when terrainKinds lists its kind', () => {
  for (const id of Object.keys(E.MODULES)) {
    const kinds = E.terrainKinds(id);
    for (const sector of E.SECTORS) {
      const results = sector.lanes.map((_, lane) => outcome(id, sector, lane));
      const neutral = sector.lanes.map((lane, i) => i).filter(i => !kinds.includes(sector.lanes[i].kind));
      const where = `${id} in ${sector.id} (terrainKinds: ${kinds.join(',') || 'none'})`;
      // Lanes the engine ignores for this machine all play out alike...
      neutral.forEach(i => assert.equal(results[i], results[neutral[0]], `${where}: ${sector.lanes[i].kind} lane changed the battle`));
      // ...and every lane it listens to plays out differently from them.
      if (kinds.length) assert.ok(neutral.length, `${where}: no neutral lane to compare against`);
      sector.lanes.forEach((lane, i) => {
        if (kinds.includes(lane.kind)) assert.notEqual(results[i], results[neutral[0]], `${where}: ${lane.kind} lane changed nothing`);
      });
    }
  }
});
