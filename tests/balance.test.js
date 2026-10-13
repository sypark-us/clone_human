'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const sim = require('../tools/balance-sim.js');

// The first-offer bot is cheap, so it uses the same 300 seeds as the CLI;
// the lookahead bot uses a smaller deterministic set so npm test stays fast.
const LAZY_SEEDS = sim.seedList(300);
const LOOKAHEAD_SEEDS = sim.seedList(20);

// A won wave-1 report whose army ended the battle with the given clones and attack.
function wonReport(loadout, units, attack) {
  const s = E.createRun({ seed: 9, loadout });
  E.chooseRoute(s, 0); E.installModule(s, s.offers[0]); E.startBattle(s);
  s.units = 100;
  while (s.phase === 'battle') E.tick(s);
  assert.equal(s.phase, 'report');
  return Object.assign(s, { units, attack });
}

test('next wave keeps half of the clones plus reinforcements', () => {
  for (const [units, kept] of [[0, 0], [1, 1], [7, 4], [10, 5]]) {
    const s = wonReport('balanced', units, 2);
    E.nextWave(s);
    assert.equal(s.units, kept + 3, units + ' clones');
  }
});

test('next wave keeps half of the attack gained above the loadout base', () => {
  for (const [loadout, base] of [['balanced', 2], ['mutation', 3]]) {
    for (const [attack, kept] of [[base, base], [base + 1, base], [base + 5, base + 2], [base + 8, base + 4]]) {
      const s = wonReport(loadout, 1, attack);
      E.nextWave(s);
      assert.equal(s.attack, kept, loadout + ' attack ' + attack);
      assert.equal(E.validateRun(s), true);
    }
  }
});

test('first-offer bot wins 20-45% overall and 10-60% per loadout, battles last 4-8 turns', () => {
  const result = sim.simulate({ policy: 'lazy', seedList: LAZY_SEEDS });
  const table = sim.formatTable('[lazy] seeds=' + LAZY_SEEDS.length, result);
  assert.ok(result.aggregate.winRate >= 0.20 && result.aggregate.winRate <= 0.45, table);
  for (const [id, row] of Object.entries(result.perLoadout)) assert.ok(row.winRate >= 0.10 && row.winRate <= 0.60, id + '\n' + table);
  assert.ok(result.aggregate.medianTurns >= 4 && result.aggregate.medianTurns <= 8, table);
});

test('lookahead bot wins at least 80% of runs', () => {
  const result = sim.simulate({ policy: 'lookahead', seedList: LOOKAHEAD_SEEDS });
  assert.ok(result.aggregate.winRate >= 0.80, sim.formatTable('[lookahead] seeds=' + LOOKAHEAD_SEEDS.length, result));
});

test('saves made under the previous enemy HP table still validate', () => {
  const legacy = [35, 90, 180, 330, 560, 900, 1400, 2150];
  const prepare = E.createRun({ seed: 4 });
  Object.assign(prepare, { hp: legacy[0], maxHp: legacy[0] });
  assert.equal(E.validateRun(prepare), true, 'prepare phase');
  const battle = E.createRun({ seed: 4 });
  E.chooseRoute(battle, 0); E.installModule(battle, battle.offers[0]); E.startBattle(battle);
  Object.assign(battle, { hp: legacy[0], maxHp: legacy[0] });
  E.tick(battle);
  assert.equal(E.validateRun(battle), true, 'battle phase');
  E.chooseRoute(prepare, 0);
  assert.equal(prepare.maxHp, E.getBattlePreview(prepare).maxHp, 'the next reset adopts the current table');
});
