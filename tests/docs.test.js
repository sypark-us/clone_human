'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../js/engine');

// AC-12: the docs quote the engine's numbers, read here from the engine itself,
// so a retune that forgets the docs fails this test.
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const DOCS = ['README.md', 'docs/product-plan.md'];

function waveHp() {
  return Array.from({ length: 8 }, (_, index) => {
    const run = E.createRun({ seed: 1 });
    Object.assign(run, { wave: index + 1, enemyId: 'standard' });
    return E.getBattlePreview(run).maxHp;
  });
}
function upgradeCosts() {
  const run = E.createRun({ seed: 1 });
  return [0, 1, 2].map(level => { run.upgrades.power = level; return E.getUpgradeCost(run, 'power'); });
}

for (const file of DOCS) {
  test(file + ' describes the half carry-over between waves', () => {
    const text = read(file);
    assert.match(text, /half|절반/i, 'half');
    assert.match(text, /carry|이월/i, 'carry-over');
    assert.ok(text.includes('ceil(clones / 2) + 3'), 'clones rule');
    assert.ok(text.includes('base + floor(gain / 2)'), 'attack rule');
  });

  test(file + ' lists the current enemy HP table and upgrade costs', () => {
    const text = read(file);
    assert.ok(text.includes(waveHp().join(' / ')), 'enemy HP ' + waveHp().join(' / '));
    assert.ok(text.includes(upgradeCosts().join(' / ') + ' E'), 'upgrade costs ' + upgradeCosts().join(' / '));
    assert.ok(text.includes('ceil(wave × 0.5)'), 'retaliation');
  });
}
