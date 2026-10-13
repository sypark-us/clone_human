'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const sim = require('../tools/balance-sim.js');

const copy = value => JSON.parse(JSON.stringify(value));

// Fight the state for real and shape the result like a forecast.
function fight(state) {
  E.startBattle(state);
  while (state.phase === 'battle') E.tick(state);
  const win = state.report.win;
  return { win, turns: state.report.turns, hpLeft: win ? 0 : state.hp, damage: state.report.damage };
}
function ready(seed, loadout, route = 0) {
  const s = E.createRun({ seed, loadout });
  E.chooseRoute(s, route); E.installModule(s, s.offers[0]);
  return s;
}

test('forecast is null while the battle cannot start', () => {
  const fresh = E.createRun({ seed: 1 });
  assert.equal(E.canStart(fresh), false);
  assert.equal(E.getForecast(fresh), null);
  const routed = copy(fresh); E.chooseRoute(routed, 0);
  assert.equal(E.getForecast(routed), null, 'reward still pending');
  const started = ready(1, 'balanced'); E.startBattle(started);
  assert.equal(E.getForecast(started), null, 'already fighting');
  assert.equal(E.getForecast(null), null);
});

test('forecast has the documented shape', () => {
  const forecast = E.getForecast(ready(1, 'balanced'));
  assert.deepEqual(Object.keys(forecast).sort(), ['damage', 'hpLeft', 'turns', 'win']);
  assert.equal(typeof forecast.win, 'boolean');
  assert.ok(Number.isInteger(forecast.turns) && forecast.turns >= 1);
});

test('forecast never mutates the state it reads', () => {
  for (const loadout of E.LOADOUTS.map(item => item.id)) for (const seed of [1, 2, 3]) {
    const s = ready(seed, loadout);
    const before = copy(s);
    E.getForecast(s);
    assert.deepEqual(s, before, loadout + ' seed ' + seed);
  }
});

test('forecast is a pure function of the state', () => {
  const s = ready(4, 'cloning');
  assert.deepEqual(E.getForecast(s), E.getForecast(s));
});

test('the real battle plays out exactly as forecast for every loadout, route and seed', () => {
  let wins = 0, losses = 0;
  for (const loadout of E.LOADOUTS.map(item => item.id)) for (let seed = 1; seed <= 40; seed++) for (const route of [0, 1]) {
    const s = ready(seed, loadout, route);
    const forecast = E.getForecast(s);
    const actual = fight(s);
    assert.deepEqual(actual, forecast, loadout + ' seed ' + seed + ' route ' + route);
    if (actual.win) wins++; else losses++;
  }
  // The agreement check is only meaningful if both outcomes occur.
  assert.ok(wins > 0 && losses > 0, 'wins ' + wins + ' losses ' + losses);
});

for (const [name, prepare] of [['lazy', sim.prepareLazy], ['lookahead', sim.prepareLookahead]]) {
  test('forecast matches every battle of a ' + name + ' campaign and leaves later offers and routes alone', () => {
    let checked = 0;
    for (const loadout of ['balanced', 'explosive', 'mutation']) for (const seed of [1, 2, 3, 4, 5]) {
      let watched = E.createRun({ seed, loadout }), control = E.createRun({ seed, loadout });
      for (let wave = 1; wave <= 8; wave++) {
        // Policies may hand back a different object, as the simulator's own loop assumes.
        watched = prepare(watched, {}); control = prepare(control, {});
        assert.deepEqual(watched, control, 'preparation is identical before forecasting');
        const forecast = E.getForecast(watched);
        const actual = fight(watched);
        fight(control);
        assert.deepEqual(actual, forecast, loadout + ' seed ' + seed + ' wave ' + wave);
        checked++;
        if (!actual.win || watched.phase === 'won') break;
        E.nextWave(watched); E.nextWave(control);
        assert.deepEqual(watched.offers, control.offers);
        assert.deepEqual(watched.routes, control.routes);
        assert.equal(watched.rngState, control.rngState);
      }
    }
    assert.ok(checked > 30, 'checked ' + checked + ' battles');
  });
}

test('moving a machine to another zone can change the forecast', () => {
  let changed = false;
  for (const loadout of E.LOADOUTS.map(item => item.id)) for (let seed = 1; seed <= 20 && !changed; seed++) {
    const s = ready(seed, loadout);
    const base = JSON.stringify(E.getForecast(s));
    for (let slot = 0; slot < 8 && !changed; slot++) if (s.slots[slot]) for (const x of [0, 4, 8]) {
      const moved = copy(s);
      E.relocateSlot(moved, slot, x, 6);
      if (JSON.stringify(E.getForecast(moved)) !== base) { changed = true; break; }
    }
  }
  assert.ok(changed);
});
