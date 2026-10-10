'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine');
const copy = value => JSON.parse(JSON.stringify(value));
const API = ['getSynergies', 'getSynergyBonus', 'canConnectSlots', 'connectSlots', 'disconnectSlots', 'getTurnSummary'];
function api() { for (const name of API) assert.equal(typeof E[name], 'function', name + ' must exist'); }
function setup(slots, changes = {}) {
  const s = E.createRun({ seed: 21 });
  E.chooseRoute(s, 0); E.installModule(s, s.offers[0]);
  s.slots = [...slots, ...Array(8).fill(null)].slice(0, 8);
  s.positions = Array.from({ length: 8 }, (_, i) => ({ x: (i % 2) * 2, y: Math.floor(i / 2) * 2 }));
  Object.assign(s, { wave: 8, sectorId: 'factory', objectiveId: 'normal', enemyId: 'standard', energy: 30, units: 0 }, changes);
  // Refresh the preview after fixture changes without starting combat.
  const preview = E.getBattlePreview(s);
  s.hp = preview.hp; s.maxHp = preview.maxHp; s.shield = preview.shield; s.enemyAttack = preview.attack;
  return s;
}
function legacy(state) { const s = copy(state); s.version = 1; delete s.connectors; return s; }

test('new runs expose the synergy API and a validated version-2 connector list', () => {
  api(); const s = E.createRun({ seed: 1 });
  assert.equal(s.version, 2); assert.deepEqual(s.connectors, []); assert.equal(E.validateRun(s), true);
  const old = legacy(s); assert.equal(E.validateRun(old), true); assert.deepEqual(E.getSynergies(old), E.getSynergies(s));
});

test('only orthogonal distance-one neighbors create directed compatible synergies', () => {
  api(); const s = setup(['mine', 'clone']);
  s.positions[1] = { x: 1, y: 0 };
  assert.deepEqual(E.getSynergies(s), [{ from: 0, to: 1, kind: 'energy', via: 'adjacent' }]);
  s.positions[1] = { x: 1, y: 1 }; assert.deepEqual(E.getSynergies(s), []);
  s.positions[1] = { x: 2, y: 0 }; assert.deepEqual(E.getSynergies(s), []);
  s.positions[1] = { x: 0, y: 1 }; assert.equal(E.getSynergies(s).length, 1);
  s.slots[1] = 'recycle'; assert.deepEqual(E.getSynergies(s), []);
});

test('compatibility includes exactly the seven directed source and target combinations', () => {
  api();
  const expected = new Map([['mine:clone', 'energy'], ['mine:soldier', 'energy'], ['mine:mutation', 'energy'],
    ['mutation:clone', 'clone'], ['mutation:soldier', 'clone'], ['clone:bomb', 'attack'], ['soldier:bomb', 'attack']]);
  for (const from of Object.keys(E.MODULES)) for (const to of Object.keys(E.MODULES)) {
    const s = setup([from, to]); const kind = expected.get(from + ':' + to);
    assert.equal(E.canConnectSlots(s, 0, 1), !!kind, from + ':' + to);
    if (kind) { E.connectSlots(s, 0, 1); assert.deepEqual(E.getSynergies(s), [{ from: 0, to: 1, kind, via: 'connector' }]); }
  }
});

test('manual connectors are directed, free, limited to two, and do not alter production order', () => {
  api(); const s = setup(['mine', 'clone', 'mutation', 'soldier', 'bomb']); const before = copy(s);
  assert.equal(E.connectSlots(s, 0, 1), s); E.connectSlots(s, 2, 3);
  assert.deepEqual(s.connectors, [{ from: 0, to: 1 }, { from: 2, to: 3 }]);
  assert.equal(E.canConnectSlots(s, 3, 4), false); E.connectSlots(s, 3, 4);
  assert.equal(s.energy, before.energy); assert.equal(s.turn, before.turn);
  assert.deepEqual(s.slots, before.slots); assert.deepEqual(s.positions, before.positions);
  assert.equal(E.validateRun(s), true);
  E.disconnectSlots(s, 0, 1); assert.deepEqual(s.connectors, [{ from: 2, to: 3 }]);
  assert.equal(E.canConnectSlots(s, 3, 4), true);
});

test('duplicate, adjacent, incompatible and malformed connector actions safely no-op', () => {
  api(); const s = setup(['mine', 'clone', 'recycle']);
  for (const [from, to] of [[-1, 1], [0, 8], [0.5, 1], ['0', 1], [0, NaN], [0, 0], [1, 0], [0, 2], [0, 7]]) {
    const before = copy(s); assert.equal(E.canConnectSlots(s, from, to), false); E.connectSlots(s, from, to); E.disconnectSlots(s, from, to); assert.deepEqual(s, before);
  }
  s.positions[1] = { x: 1, y: 0 }; assert.equal(E.canConnectSlots(s, 0, 1), false);
  const adjacent = copy(s); E.connectSlots(s, 0, 1); assert.deepEqual(s, adjacent);
  s.positions[1] = { x: 2, y: 0 }; E.connectSlots(s, 0, 1);
  const connected = copy(s); assert.equal(E.canConnectSlots(s, 0, 1), false); E.connectSlots(s, 0, 1); E.disconnectSlots(s, 1, 0); assert.deepEqual(s, connected);
});

test('connectors are locked in battle, reports and terminal states', () => {
  api(); const s = setup(['mine', 'clone']); E.connectSlots(s, 0, 1);
  for (const phase of ['battle', 'report', 'won', 'lost']) {
    s.phase = phase; const before = copy(s);
    assert.equal(E.canConnectSlots(s, 0, 1), false); E.connectSlots(s, 0, 1); E.disconnectSlots(s, 0, 1); assert.deepEqual(s, before);
  }
});

test('relocation retains manual links but duplicate adjacency contributes only once', () => {
  api(); const s = setup(['mine', 'clone']); E.connectSlots(s, 0, 1);
  E.relocateSlot(s, 1, 1, 0);
  assert.deepEqual(s.connectors, [{ from: 0, to: 1 }]);
  assert.deepEqual(E.getSynergies(s), [{ from: 0, to: 1, kind: 'energy', via: 'adjacent' }]);
  assert.deepEqual(E.getSynergyBonus(s, 1), { costReduction: 1, clones: 0, damageMultiplier: 1 });
  E.relocateSlot(s, 1, 2, 0); assert.equal(E.getSynergies(s)[0].via, 'connector');
  assert.equal(E.validateRun(s), true);
});

test('each bonus type caps per target across multiple adjacent and manual sources', () => {
  api(); const s = setup(['mine', 'mine', 'clone', 'mutation', 'mutation', 'mine']);
  s.positions[2] = { x: 5, y: 3 }; s.positions[0] = { x: 4, y: 3 }; s.positions[1] = { x: 5, y: 4 };
  s.positions[3] = { x: 5, y: 2 }; s.positions[4] = { x: 6, y: 3 };
  E.connectSlots(s, 5, 2);
  assert.equal(E.getSynergies(s).filter(edge => edge.to === 2).length, 5);
  assert.deepEqual(E.getSynergyBonus(s, 2), { costReduction: 1, clones: 1, damageMultiplier: 1 });
  const bomb = setup(['clone', 'soldier', 'bomb']); bomb.positions[2] = { x: 1, y: 0 };
  assert.deepEqual(E.getSynergyBonus(bomb, 2), { costReduction: 0, clones: 0, damageMultiplier: 1.2 });
});

test('replacement and production reordering prune incompatible slot-based connectors', () => {
  api(); const s = setup(['mine', 'clone', 'mutation', 'soldier']);
  E.connectSlots(s, 0, 1); E.connectSlots(s, 2, 3);
  s.needsReward = true; s.offers = ['recycle', 'clone', 'soldier']; E.selectSlot(s, 1); E.installModule(s, 'recycle');
  assert.deepEqual(s.connectors, [{ from: 2, to: 3 }]);
  E.selectSlot(s, 2); E.moveSlot(s, 1); assert.deepEqual(s.connectors, []);
  const compatible = setup(['mine', 'clone', 'soldier']); E.connectSlots(compatible, 0, 1);
  E.selectSlot(compatible, 1); E.moveSlot(compatible, 1);
  assert.deepEqual(compatible.connectors, [{ from: 0, to: 1 }]);
  assert.equal(compatible.slots[1], 'soldier'); assert.equal(E.validateRun(compatible), true);
});

test('mine links reduce cloning, training and mutation costs before affordability checks', () => {
  api();
  for (const [target, budget, clones] of [['clone', 3, 2], ['soldier', 2, 1], ['mutation', 4, 0]]) {
    const s = setup([target, 'mine'], { energy: budget }); E.connectSlots(s, 1, 0); E.startBattle(s); E.tick(s);
    assert.equal(s.metrics[target].activations, 1, target); assert.equal(s.metrics[target].clones, clones);
    assert.equal(s.energy, 6, target); // The later Miner still executes in its original slot.
    if (target === 'mutation') assert.equal(s.attack, 4);
  }
});

test('suppression adds its cost penalty before the single synergy discount', () => {
  api(); const s = setup(['clone', 'mine'], { enemyId: 'jam', energy: 5 }); E.connectSlots(s, 1, 0); E.startBattle(s); E.tick(s);
  assert.equal(s.metrics.clone.clones, 2); assert.equal(s.energy, 6);
});

test('mutation links add clones to output, reactions and metrics without activating the source', () => {
  api(); const s = setup(['clone', 'mutation', 'onclone'], { energy: 4 }); E.connectSlots(s, 1, 0); E.startBattle(s); E.tick(s);
  assert.equal(s.metrics.clone.clones, 3); assert.equal(s.metrics.mutation.activations, 0);
  assert.equal(s.metrics.onclone.activations, 1); assert.equal(s.eventsTotal, 3);
  assert.equal(E.getTurnSummary(s).shieldDamage, 12); // 6 reaction damage + 6 basic damage, absorbed.
});

test('mutation links also grant an extra trained clone', () => {
  api(); const s = setup(['soldier', 'mutation'], { energy: 3 }); E.connectSlots(s, 1, 0); E.startBattle(s); E.tick(s);
  assert.equal(s.metrics.soldier.clones, 2); assert.equal(s.metrics.mutation.activations, 0);
});

test('terrain and mutation synergy permit four clones per activation in both save versions', () => {
  api();
  for (const version of [1, 2]) {
    let s = setup(['clone', 'mutation'], { energy: 4 }); s.positions[0] = { x: 5, y: 0 }; s.positions[1] = { x: 6, y: 0 };
    if (version === 1) s = legacy(s);
    E.startBattle(s); E.tick(s);
    assert.equal(s.version, version); assert.equal(s.metrics.clone.clones, 4); assert.equal(E.validateRun(s), true);
    const invalid = copy(s); invalid.metrics.clone.clones = 5; assert.equal(E.validateRun(invalid), false);
  }
});

test('demolition synergy composes with terrain and armor before one rounding operation', () => {
  api();
  for (const enemyId of ['standard', 'armor']) {
    const s = setup(['bomb', 'clone'], { sectorId: 'wasteland', units: 2, energy: 0, wave: 3, enemyId });
    E.connectSlots(s, 1, 0); E.startBattle(s); E.tick(s);
    assert.equal(s.metrics.bomb.damage, Math.round(28 * 1.2 * 1.5 * (enemyId === 'armor' ? 0.4 : 1)));
    assert.equal(s.metrics.bomb.activations, 1); assert.equal(s.metrics.clone.activations, 0);
  }
});

test('echo repeats preserve per-activation synergy without recursive activations or extra turns', () => {
  api(); const s = setup(['clone', 'echo', 'mine', 'mutation'], { energy: 9 });
  E.connectSlots(s, 2, 0); E.connectSlots(s, 3, 0); E.startBattle(s); E.tick(s);
  assert.equal(s.turn, 1); assert.equal(s.metrics.clone.activations, 3); assert.equal(s.metrics.clone.clones, 9);
  assert.equal(s.metrics.echo.activations, 1); assert.equal(s.metrics.mine.activations, 1); assert.equal(s.metrics.mutation.activations, 1);
  assert.equal(s.eventsTotal, 4); assert.ok(s.chainPeak <= 120); assert.equal(E.validateRun(s), true);
});

test('legacy saves migrate only on a successful first connector and retain ordinary actions', () => {
  api(); const s = legacy(setup(['mine', 'clone'])); const before = copy(s);
  E.getSynergies(s); E.getSynergyBonus(s, 0); E.getTurnSummary(s); E.connectSlots(s, 1, 0); E.disconnectSlots(s, 0, 1);
  assert.deepEqual(s, before);
  E.selectSlot(s, 1); E.relocateSlot(s, 1, 3, 0);
  assert.equal(s.version, 1); assert.equal('connectors' in s, false); assert.equal(E.validateRun(s), true);
  E.connectSlots(s, 0, 1); assert.equal(s.version, 2); assert.deepEqual(s.connectors, [{ from: 0, to: 1 }]);
  assert.equal(E.validateRun(s), true); E.disconnectSlots(s, 0, 1); assert.equal(s.version, 2);
});

test('save validation strictly distinguishes old and new schemas and rejects invalid connectors', () => {
  api(); const valid = setup(['mine', 'clone', 'mutation', 'soldier']);
  const invalidChanges = [s => delete s.connectors, s => s.version = 3, s => s.connectors = null,
    s => s.connectors = [{ from: 0, to: 0 }], s => s.connectors = [{ from: -1, to: 1 }], s => s.connectors = [{ from: 0, to: 8 }],
    s => s.connectors = [{ from: '0', to: 1 }], s => s.connectors = [{ from: 0.5, to: 1 }], s => s.connectors = [{ from: 0, to: Infinity }],
    s => s.connectors = [{ from: 1, to: 0 }], s => s.connectors = [{ from: 0, to: 7 }],
    s => s.connectors = [{ from: 0, to: 1 }, { from: 0, to: 1 }],
    s => s.connectors = [{ from: 0, to: 1 }, { from: 2, to: 3 }, { from: 0, to: 2 }],
    s => s.connectors = [{ from: 0, to: 1, kind: 'energy' }], s => s.connectors = Array(1), s => s.connectors = ['0:1']];
  for (const mutate of invalidChanges) { const s = copy(valid); mutate(s); assert.equal(E.validateRun(s), false, mutate.toString()); }
  const old = legacy(valid); assert.equal(E.validateRun(old), true); old.connectors = []; assert.equal(E.validateRun(old), false);
  E.connectSlots(valid, 0, 1); valid.positions[1] = { x: 1, y: 0 }; assert.equal(E.validateRun(valid), true);
  assert.equal(E.validateRun(copy(valid)), true);
});

test('synergy queries are read-only and returned values cannot mutate state', () => {
  api(); const s = setup(['mine', 'clone']); E.connectSlots(s, 0, 1); const before = copy(s);
  const edges = E.getSynergies(s); edges[0].from = 7; edges.push({ from: 7, to: 1 });
  const bonus = E.getSynergyBonus(s, 1); bonus.clones = 10;
  E.canConnectSlots(s, 0, 1); E.getTurnSummary(s); assert.deepEqual(s, before);
  for (const slot of [-1, 8, NaN, '0']) assert.deepEqual(E.getSynergyBonus(s, slot), { costReduction: 0, clones: 0, damageMultiplier: 1 });
});

test('turn summary counts actual core hits, shield absorption and retaliation despite regeneration', () => {
  api(); const s = setup(['clone'], { wave: 4, energy: 100, units: 8 }); E.startBattle(s);
  assert.deepEqual(E.getTurnSummary(s), { damage: 0, shieldDamage: 0, clonesLost: 0 });
  E.tick(s); assert.deepEqual(E.getTurnSummary(s), { damage: 4, shieldDamage: 16, clonesLost: 3 });
  E.tick(s); E.tick(s); // This turn regenerates a shield after damage.
  assert.equal(s.shield, 8); assert.deepEqual(E.getTurnSummary(s), { damage: 16, shieldDamage: 0, clonesLost: 3 });
  const before = copy(s); E.getTurnSummary(s); assert.deepEqual(s, before);
  assert.deepEqual(E.getTurnSummary(copy(s)), E.getTurnSummary(s));
});

test('turn summary ignores unknown notes and bounds malformed externally supplied data', () => {
  api(); const s = setup([]);
  s.lastTurn = [{ kind: 'damage', text: '피해 10 · 방어막 4', slot: -1 }, { kind: 'loss', text: '적 반격: 병사 -2', slot: -1 },
    { kind: 'idle', text: '피해 999', slot: 0 }, { kind: 'damage', text: '피해 1\n', slot: -1 }, { kind: 'damage', text: '피해 Infinity', slot: -1 }, null];
  assert.deepEqual(E.getTurnSummary(s), { damage: 10, shieldDamage: 4, clonesLost: 2 });
  s.lastTurn = Array.from({ length: 1000 }, () => ({ kind: 'damage', text: '피해 999999 · 방어막 999999', slot: -1 }));
  const total = E.getTurnSummary(s); assert.ok(total.damage <= 999999); assert.ok(total.shieldDamage <= 999999);
  assert.deepEqual(E.getTurnSummary(null), { damage: 0, shieldDamage: 0, clonesLost: 0 });
});

test('restored connector battles are deterministic through all remaining turns', () => {
  api(); const s = setup(['mine', 'clone', 'mutation', 'bomb', 'revive', 'onclone', 'recycle']);
  E.connectSlots(s, 0, 1); E.connectSlots(s, 2, 1); E.startBattle(s); E.tick(s);
  const restored = copy(s); assert.equal(E.validateRun(restored), true);
  while (s.phase === 'battle') {
    E.tick(s); E.tick(restored); assert.deepEqual(s, restored); assert.equal(E.validateRun(s), true);
    assert.deepEqual(E.getTurnSummary(s), E.getTurnSummary(restored));
  }
});

function playLinkedFactory(seed, loadout, useLegacy) {
  let s = E.createRun({ seed, loadout });
  if (useLegacy) s = legacy(s);
  const scores = { mine: 4, clone: 7, soldier: 2, mutation: 9, echo: 6, boost: 3, bomb: 1, recycle: 6, onclone: 5, onkill: 0, autoclone: 0, revive: 1 };
  let turns = 0, linksUsed = 0;
  const verify = () => assert.equal(E.validateRun(copy(s)), true, `${loadout}, seed ${seed}, wave ${s.wave}, phase ${s.phase}`);
  while (s.phase === 'prepare') {
    E.chooseRoute(s, s.routes[0].enemyId === 'swarm' || s.routes[0].objectiveId === 'rush' ? 1 : 0);
    const score = id => scores[id] - s.slots.filter(other => other === id).length * (id === 'mutation' ? 8 : id === 'clone' ? 4 : 5);
    const offer = [...s.offers].sort((a, b) => score(b) - score(a))[0];
    if (!s.slots.includes(null)) E.selectSlot(s, s.slots.reduce((index, id, slot) => scores[id] < scores[s.slots[index]] ? slot : index, 0));
    E.installModule(s, offer);
    for (const id of ['fort', 'training', 'power']) {
      const desired = { fort: 3, training: 2, power: 1 };
      while (s.energy >= 20 && s.upgrades[id] < desired[id]) E.buyUpgrade(s, id);
    }
    // Rebuild the two supplemental links each preparation phase using the same
    // controls as a player, preferring extra clones, then reduced energy costs.
    for (const link of [...(s.connectors || [])]) E.disconnectSlots(s, link.from, link.to);
    for (const source of ['mutation', 'mine', 'clone', 'soldier']) {
      for (let from = 0; from < 8; from++) if (s.slots[from] === source) for (let to = 0; to < 8; to++) {
        if (E.canConnectSlots(s, from, to)) { E.connectSlots(s, from, to); linksUsed++; }
      }
    }
    verify(); E.startBattle(s); verify();
    while (s.phase === 'battle') {
      E.tick(s); turns++; verify();
      assert.ok(s.eventsTotal <= s.turn * 120);
      assert.ok(E.getTurnSummary(s).damage <= s.maxHp);
    }
    if (s.phase === 'report') { E.nextWave(s); verify(); }
  }
  return { state: s, turns, linksUsed };
}

test('every loadout completes seeded eight-wave runs using only public actions and manual connectors', () => {
  api();
  for (const loadout of E.LOADOUTS) for (const seed of [1, 7, 21, 42, 50]) {
    const result = playLinkedFactory(seed, loadout.id, false);
    assert.equal(result.state.phase, 'won', `${loadout.id}, seed ${seed}`);
    assert.ok(result.linksUsed > 0); assert.ok(result.turns <= 96);
  }
});

test('a complete legacy run migrates through public connector actions and finishes deterministically', () => {
  api(); const migrated = playLinkedFactory(7, 'balanced', true); const current = playLinkedFactory(7, 'balanced', false);
  assert.equal(migrated.state.phase, 'won'); assert.equal(migrated.state.version, 2);
  assert.deepEqual(migrated, current);
});
