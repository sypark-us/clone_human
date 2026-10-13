#!/usr/bin/env node
'use strict';
// Deterministic balance simulator over the real engine. Bots play whole runs;
// the CLI prints per-loadout win rate, battle length and wave reached.
//   node tools/balance-sim.js [--policy lazy|lookahead|both] [--seeds 300] [--seed-base 1]
//                             [--loadout id] [--prefer id] [--avoid id] [--no-upgrades] [--json]
const path = require('node:path');
const E = require(path.join(__dirname, '../js/engine.js'));

const copy = value => JSON.parse(JSON.stringify(value));
const zoneOf = position => Math.floor(position.x / 4);

function playBattle(s) {
  E.startBattle(s);
  while (s.phase === 'battle') E.tick(s);
  return s;
}
// Outcome of fighting the current preparation as-is, on a copy.
function evaluate(s) {
  const result = playBattle(copy(s));
  const win = result.phase !== 'lost';
  return win
    ? 1000 - result.turn * 20 + result.energy * 0.5 + result.units * 2 + result.attack * 3
    : 500 * (result.maxHp - result.hp) / result.maxHp;
}
function pickOffer(offers, options) {
  if (options.prefer && offers.includes(options.prefer)) return options.prefer;
  return offers.find(id => id !== options.avoid) || offers[0];
}
function candidateOffers(offers, options) {
  if (options.prefer && offers.includes(options.prefer)) return [options.prefer];
  const allowed = offers.filter(id => id !== options.avoid);
  return allowed.length ? allowed : offers;
}
function placeInZone(s, slot, zone) {
  const used = new Set(s.positions.map(p => p.x + ':' + p.y));
  for (let x = zone * 4; x < zone * 4 + 4; x++) for (let y = 0; y < 7; y++) {
    if (!used.has(x + ':' + y)) { E.relocateSlot(s, slot, x, y); return true; }
  }
  return false;
}

// Careless player: first route, first offer into the selected plot (the first
// empty one, as nextWave preselects), never moves, upgrades or rerolls.
function prepareLazy(s, options) {
  E.chooseRoute(s, 0);
  const empty = s.slots.indexOf(null);
  if (empty >= 0) E.selectSlot(s, empty);
  E.installModule(s, pickOffer(s.offers, options));
  return s;
}

// One-wave lookahead: tries every route x offer x plot (and, for a new plot,
// each terrain zone), then greedily buys upgrades while they improve the fight.
function prepareLookahead(s, options) {
  let best = null, bestScore = -Infinity;
  const consider = candidate => {
    const score = evaluate(candidate);
    if (score > bestScore) { bestScore = score; best = candidate; }
  };
  for (let route = 0; route < 2; route++) {
    const base = copy(s);
    E.chooseRoute(base, route);
    const empty = base.slots.indexOf(null);
    const targets = empty >= 0 ? [empty] : [0, 1, 2, 3, 4, 5, 6, 7];
    for (const id of candidateOffers(base.offers, options)) for (const slot of targets) {
      const candidate = copy(base);
      E.selectSlot(candidate, slot);
      E.installModule(candidate, id);
      consider(candidate);
      if (empty < 0) continue;
      for (let zone = 0; zone < 3; zone++) {
        if (zone === zoneOf(candidate.positions[slot])) continue;
        const moved = copy(candidate);
        if (placeInZone(moved, slot, zone)) consider(moved);
      }
    }
  }
  if (options.upgrades !== false) {
    for (let step = 0; step < 4; step++) {
      let next = null, nextScore = bestScore + 5;
      const purchases = [
        ...E.UPGRADES.map(upgrade => c => E.buyUpgrade(c, upgrade.id)),
        ...best.slots.map((id, slot) => id ? c => E.upgradeMachine(c, slot) : null).filter(Boolean)
      ];
      for (const buy of purchases) {
        const candidate = copy(best);
        buy(candidate);
        if (candidate.energy === best.energy) continue;
        const score = evaluate(candidate);
        if (score > nextScore) { nextScore = score; next = candidate; }
      }
      if (!next) break;
      best = next; bestScore = nextScore;
    }
  }
  return best;
}

const POLICIES = { lazy: prepareLazy, lookahead: prepareLookahead };

function playRun(seed, loadout, options = {}) {
  const prepare = POLICIES[options.policy || 'lazy'];
  let s = E.createRun({ seed, loadout });
  const battles = [];
  while (s.phase !== 'won' && s.phase !== 'lost') {
    if (s.phase === 'report') { E.nextWave(s); continue; }
    s = prepare(s, options);
    playBattle(s);
    battles.push({ wave: s.wave, turns: s.turn, win: s.phase !== 'lost' });
  }
  return { seed, loadout, won: s.phase === 'won', wave: s.wave, battles };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function summarize(runs) {
  const turns = runs.flatMap(run => run.battles.map(battle => battle.turns));
  const byWave = Array.from({ length: 8 }, (_, index) => median(runs.flatMap(run => run.battles.filter(b => b.wave === index + 1).map(b => b.turns))));
  const reached = {};
  for (const run of runs) reached[run.wave] = (reached[run.wave] || 0) + 1;
  const wins = runs.filter(run => run.won).length;
  return { runs: runs.length, wins, winRate: runs.length ? wins / runs.length : 0, medianTurns: median(turns), medianTurnsByWave: byWave, meanWave: runs.reduce((sum, run) => sum + run.wave, 0) / (runs.length || 1), reached };
}
function seedList(count, base = 1) { return Array.from({ length: count }, (_, index) => base + index); }
function simulate(options = {}) {
  const seeds = options.seedList || seedList(options.seeds || 300, options.seedBase || 1);
  const loadouts = options.loadouts || E.LOADOUTS.map(loadout => loadout.id);
  const runs = {};
  for (const loadout of loadouts) runs[loadout] = seeds.map(seed => playRun(seed, loadout, options));
  return report(runs);
}
function report(runs) {
  const perLoadout = Object.fromEntries(Object.entries(runs).map(([id, list]) => [id, summarize(list)]));
  return { perLoadout, aggregate: summarize(Object.values(runs).flat()) };
}

function formatTable(title, result) {
  const pct = value => (value * 100).toFixed(1).padStart(5) + '%';
  const row = (id, r) => id.padEnd(10) + ' ' + pct(r.winRate) + '  ' + String(r.medianTurns).padStart(4) + '   ' +
    r.medianTurnsByWave.map(v => v === null ? ' -' : String(v).padStart(2)).join(' ') + '   ' + r.meanWave.toFixed(2);
  return [title, 'loadout      win%  turns  median by wave 1..8      mean wave',
    ...Object.entries(result.perLoadout).map(([id, r]) => row(id, r)), row('ALL', result.aggregate)].join('\n');
}

module.exports = { POLICIES, playRun, simulate, summarize, report, seedList, median, formatTable, prepareLazy, prepareLookahead };

// Parallel CLI: each worker plays one (loadout, seed chunk) slice of runs.
if (require.main === module) {
  const { Worker } = require('node:worker_threads');
  const args = process.argv.slice(2);
  const flag = name => args.includes('--' + name);
  const value = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
  const base = { seeds: Number(value('seeds', 300)), seedBase: Number(value('seed-base', 1)), prefer: value('prefer'), avoid: value('avoid'), upgrades: !flag('no-upgrades') };
  const policyArg = value('policy', 'both');
  const policies = policyArg === 'both' ? ['lazy', 'lookahead'] : [policyArg];
  const loadouts = value('loadout') ? [value('loadout')] : E.LOADOUTS.map(loadout => loadout.id);
  const threads = Math.max(1, Math.min(Number(value('threads', require('node:os').availableParallelism())), 64));
  const seeds = seedList(base.seeds, base.seedBase);
  const jobs = [];
  for (const policy of policies) for (const loadout of loadouts) {
    const size = Math.ceil(seeds.length / Math.max(1, Math.floor(threads / loadouts.length)));
    for (let i = 0; i < seeds.length; i += size) jobs.push({ policy, loadout, seedList: seeds.slice(i, i + size) });
  }
  const code = 'const { parentPort, workerData } = require("node:worker_threads");' +
    'const sim = require(' + JSON.stringify(__filename) + ');' +
    'parentPort.postMessage(workerData.seedList.map(seed => sim.playRun(seed, workerData.loadout, workerData.options)));';
  const results = {};
  let next = 0, running = 0;
  const started = Date.now();
  const done = () => {
    const output = {};
    for (const policy of policies) output[policy] = report(Object.fromEntries(loadouts.map(id => [id, results[policy + ':' + id] || []])));
    if (flag('json')) console.log(JSON.stringify(output, null, 2));
    else {
      const label = ' seeds=' + base.seeds + ' base=' + base.seedBase + (base.prefer ? ' prefer=' + base.prefer : '') + (base.avoid ? ' avoid=' + base.avoid : '') + (base.upgrades ? '' : ' no-upgrades');
      for (const policy of policies) console.log(formatTable('[' + policy + ']' + label, output[policy]) + '\n');
      console.log('elapsed ' + ((Date.now() - started) / 1000).toFixed(1) + 's');
    }
  };
  const launch = () => {
    if (next >= jobs.length) { if (!running) done(); return; }
    const job = jobs[next++];
    running++;
    const worker = new Worker(code, { eval: true, workerData: { loadout: job.loadout, seedList: job.seedList, options: { ...base, policy: job.policy } } });
    worker.once('message', runs => { (results[job.policy + ':' + job.loadout] ||= []).push(...runs); });
    worker.once('error', error => { console.error(error); process.exitCode = 1; });
    worker.once('exit', () => { running--; launch(); });
  };
  for (let i = 0; i < Math.min(threads, jobs.length); i++) launch();
}
